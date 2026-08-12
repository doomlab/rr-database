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

    if (decision === "APPROVED") {
      // Same invariant the Zotero import maintains: every confirmed paper
      // gets an extraction placeholder so the coding queue can see it.
      await db.paperExtraction.upsert({
        where: { paperId },
        create: { paperId, extractedData: {}, needsReview: true },
        update: {},
      })
    }

    return paper
  }
)
