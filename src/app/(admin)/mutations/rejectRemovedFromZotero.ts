import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { findPapersRemovedFromZotero } from "src/lib/zoteroRemoved"

const RejectRemovedFromZotero = z.object({
  // Preview only: list what would be excluded without changing anything.
  dryRun: z.boolean(),
})

const NOTE = "Removed from the Zotero library"

export default resolver.pipe(
  resolver.zod(RejectRemovedFromZotero),
  resolver.authorize(["SUPER_ADMIN"]),
  async ({ dryRun }, ctx) => {
    const userId = ctx.session.userId as number
    const { zoteroCount, rekeyed, removed, attention } = await findPapersRemovedFromZotero()
    const preview = removed.slice(0, 15).map((p) => `#${p.id} ${p.title}${p.year ? ` (${p.year})` : ""}`)

    if (!dryRun && removed.length > 0) {
      const ids = removed.map((p) => p.id)
      await db.paper.updateMany({
        where: { id: { in: ids } },
        data: {
          status: "REJECTED",
          reviewNote: NOTE,
          reviewedById: userId,
          reviewedAt: new Date(),
          workflowMarker: null,
          workflowMarkedById: null,
          workflowMarkedAt: null,
        },
      })
      await db.paperEditHistory.createMany({
        data: ids.map((paperId) => ({
          paperId,
          userId,
          source: "zotero",
          summary: `Excluded: ${NOTE}`,
        })),
      })
    }

    const attentionPreview = attention
      .slice(0, 40)
      .map((a) => `#${a.paper.id} ${a.paper.title}${a.paper.year ? ` (${a.paper.year})` : ""} [${a.reasons.join(", ")}]`)
    return { dryRun, zoteroCount, rekeyed, count: removed.length, preview, attentionCount: attention.length, attentionPreview }
  }
)
