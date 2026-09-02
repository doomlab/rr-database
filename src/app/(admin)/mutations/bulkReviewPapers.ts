import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const BulkReviewPapers = z.object({
  paperIds: z.array(z.number()).min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().optional(),
})

export default resolver.pipe(
  resolver.zod(BulkReviewPapers),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ paperIds, decision, reviewNote }, ctx) => {
    const userId = ctx.session.userId as number

    await db.paper.updateMany({
      where: { id: { in: paperIds } },
      data: {
        status: decision,
        reviewedById: userId,
        reviewedAt: new Date(),
        reviewNote: reviewNote ?? null,
      },
    })

    await db.paperEditHistory.createMany({
      data: paperIds.map((paperId) => ({
        paperId,
        userId,
        source: "review",
        summary: decision === "APPROVED" ? "Approved" : "Rejected",
      })),
    })

    if (decision === "APPROVED") {
      // Same "give every approved paper a home in the Study-centric browse
      // view" rule as the single-paper reviewPaper mutation.
      const existingLinks = await db.studyPaper.findMany({
        where: { paperId: { in: paperIds } },
        select: { paperId: true },
      })
      const linked = new Set(existingLinks.map((l) => l.paperId))
      for (const paperId of paperIds) {
        if (linked.has(paperId)) continue
        const study = await db.study.create({ data: {} })
        await db.studyPaper.create({ data: { studyId: study.id, paperId, role: "OTHER" } })
      }
    }

    return { count: paperIds.length }
  }
)
