import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const MARKER_LABELS = { DONE: "Done", LATER: "Later", QUESTION: "Question" } as const

const SetWorkflowMarker = z.object({
  paperIds: z.array(z.number()).min(1),
  // null clears the marker, returning the group to the queue.
  marker: z.enum(["DONE", "LATER", "QUESTION"]).nullable(),
  note: z.string().trim().max(2000).optional(),
})

export default resolver.pipe(
  resolver.zod(SetWorkflowMarker),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ paperIds, marker, note }, ctx) => {
    const userId = ctx.session.userId as number
    const now = new Date()

    await db.paper.updateMany({
      where: { id: { in: paperIds } },
      data: marker
        ? { workflowMarker: marker, workflowNote: note || null, workflowMarkedById: userId, workflowMarkedAt: now }
        : { workflowMarker: null, workflowNote: null, workflowMarkedById: null, workflowMarkedAt: null },
    })

    await db.paperEditHistory.createMany({
      data: paperIds.map((paperId) => ({
        paperId,
        userId,
        source: "workflow",
        summary: marker
          ? `Marked ${MARKER_LABELS[marker]}${note ? `: ${note}` : ""}`
          : "Workflow marker cleared",
      })),
    })

    return { success: true }
  }
)
