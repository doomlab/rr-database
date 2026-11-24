import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const RejectStudy = z.object({
  studyId: z.number(),
  reviewNote: z.string().trim().max(2000).optional(),
})

// Rejects every item in a study at once. Nothing is deleted: the items go to
// the excluded list (so they aren't re-discovered) and the study drops off the
// public site because it has no public items left.
export default resolver.pipe(
  resolver.zod(RejectStudy),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ studyId, reviewNote }, ctx) => {
    const userId = ctx.session.userId as number

    const papers = await db.paper.findMany({
      where: { studyPaper: { studyId }, status: { notIn: ["REJECTED", "DUPLICATE"] } },
      select: { id: true },
    })
    if (papers.length === 0) throw new Error("There is nothing in this study to reject.")
    const ids = papers.map((p) => p.id)

    await db.paper.updateMany({
      where: { id: { in: ids } },
      data: { status: "REJECTED", reviewedById: userId, reviewedAt: new Date(), reviewNote: reviewNote || null },
    })
    await db.paperEditHistory.createMany({
      data: ids.map((paperId) => ({
        paperId,
        userId,
        source: "review",
        summary: `Rejected with its whole study (#${studyId})${reviewNote ? `: ${reviewNote}` : ""}`,
      })),
    })

    return { count: ids.length }
  }
)
