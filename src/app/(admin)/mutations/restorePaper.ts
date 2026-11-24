import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const RestorePaper = z.object({
  paperId: z.number(),
  // PENDING_REVIEW puts it back in the review queue; APPROVED publishes it.
  to: z.enum(["PENDING_REVIEW", "APPROVED"]),
})

// Brings a rejected (or duplicate-marked) item back: either straight to
// approved, or back to the queue to be decided again.
export default resolver.pipe(
  resolver.zod(RestorePaper),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ paperId, to }, ctx) => {
    const userId = ctx.session.userId as number

    const paper = await db.paper.findUnique({ where: { id: paperId }, select: { status: true } })
    if (!paper) throw new Error("Item not found.")
    if (paper.status !== "REJECTED" && paper.status !== "DUPLICATE") {
      throw new Error("Only rejected items can be restored.")
    }

    await db.paper.update({
      where: { id: paperId },
      data:
        to === "APPROVED"
          ? { status: "APPROVED", reviewedById: userId, reviewedAt: new Date(), canonicalPaperId: null }
          : {
              status: "PENDING_REVIEW",
              reviewedById: null,
              reviewedAt: null,
              reviewNote: null,
              canonicalPaperId: null,
              workflowMarker: null,
              workflowMarkedById: null,
              workflowMarkedAt: null,
            },
    })

    // The browse page is study-centric: an approved item needs a study.
    if (to === "APPROVED") {
      const link = await db.studyPaper.findUnique({ where: { paperId } })
      if (!link) {
        const study = await db.study.create({ data: {} })
        await db.studyPaper.create({ data: { studyId: study.id, paperId, role: "OTHER" } })
      }
    }

    await db.paperEditHistory.create({
      data: {
        paperId,
        userId,
        source: "review",
        summary: to === "APPROVED" ? "Restored and approved" : "Restored to the review queue",
      },
    })

    return { to }
  }
)
