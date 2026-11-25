import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { cleanTitle } from "src/lib/cleanText"

const CleanTitleEntities = z.object({
  // Preview only: list what would change without changing anything.
  dryRun: z.boolean(),
})

// Decodes HTML entities (&nbsp;, &amp;, …) that came in with some titles and
// tidies the whitespace. New imports are cleaned as they arrive; this fixes
// the ones already stored. Only touches titles that contain an entity.
export default resolver.pipe(
  resolver.zod(CleanTitleEntities),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ dryRun }, ctx) => {
    const userId = ctx.session.userId as number

    const candidates = await db.paper.findMany({
      where: { title: { contains: "&" } },
      select: { id: true, title: true },
      orderBy: { id: "asc" },
    })
    const changes = candidates
      .map((p) => ({ id: p.id, before: p.title, after: cleanTitle(p.title) }))
      .filter((c) => c.after !== c.before)

    if (!dryRun) {
      for (const c of changes) {
        await db.paper.update({ where: { id: c.id }, data: { title: c.after } })
      }
      if (changes.length > 0) {
        await db.paperEditHistory.createMany({
          data: changes.map((c) => ({
            paperId: c.id,
            userId,
            source: "cleanup",
            summary: "Cleaned HTML entities out of the title",
          })),
        })
      }
    }

    return {
      dryRun,
      count: changes.length,
      preview: changes.slice(0, 15).map((c) => `#${c.id} ${c.before}  →  ${c.after}`),
    }
  }
)
