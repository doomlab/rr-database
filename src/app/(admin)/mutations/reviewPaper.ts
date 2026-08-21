import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const ReviewPaper = z.object({
  paperId: z.number(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().optional(),
})

export default resolver.pipe(
  resolver.zod(ReviewPaper),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ paperId, decision, reviewNote }, ctx) => {
    const userId = ctx.session.userId as number

    const paper = await db.paper.update({
      where: { id: paperId },
      data: {
        status: decision,
        reviewedById: userId,
        reviewedAt: new Date(),
        reviewNote: reviewNote ?? null,
      },
    })

    await db.paperEditHistory.create({
      data: {
        paperId,
        userId,
        source: "review",
        summary: decision === "APPROVED" ? "Approved" : "Rejected",
      },
    })

    if (decision === "APPROVED") {
      // Same invariant the Zotero import maintains: every confirmed paper
      // gets an extraction placeholder so the coding queue can see it.
      await db.paperExtraction.upsert({
        where: { paperId },
        create: { paperId, extractedData: {}, needsReview: true },
        update: {},
      })

      // The main browse page is Study-centric — a confirmed paper with no
      // Study membership at all is invisible there. Give it a solo Study so
      // it shows up immediately; it stays eligible to be merged into a
      // multi-paper Study later via the Link papers page.
      const existingLink = await db.studyPaper.findUnique({ where: { paperId } })
      if (!existingLink) {
        const study = await db.study.create({ data: {} })
        await db.studyPaper.create({ data: { studyId: study.id, paperId, role: "OTHER" } })
      }
    }

    return paper
  }
)
