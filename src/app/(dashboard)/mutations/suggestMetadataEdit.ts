import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const SuggestMetadataEdit = z.object({
  paperId: z.number(),
  title: z.string().nullable(),
  doi: z.string().nullable(),
  abstract: z.string().nullable(),
  year: z.number().nullable(),
  venue: z.string().nullable(),
  volume: z.string().nullable(),
  issue: z.string().nullable(),
  pages: z.string().nullable(),
  publisher: z.string().nullable(),
  url: z.string().nullable(),
  note: z.string().max(1000).nullable(),
})

export default resolver.pipe(
  resolver.zod(SuggestMetadataEdit),
  resolver.authorize(),
  async ({ paperId, note, ...fields }, ctx) => {
    const userId = ctx.session.userId as number
    const isAdmin = ctx.session.role === "ADMIN" || ctx.session.role === "SUPER_ADMIN"

    if (isAdmin) {
      const updates = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null))
      const [updated] = await db.$transaction([
        db.paper.update({ where: { id: paperId }, data: updates }),
        db.paperEditHistory.create({ data: { paperId, userId, source: "manual", summary: note ?? undefined } }),
      ])
      return { applied: true as const, paper: updated }
    }

    const suggestion = await db.metadataEditSuggestion.upsert({
      where: { userId_paperId: { userId, paperId } },
      create: { userId, paperId, note, ...fields },
      update: { note, ...fields, resolved: false },
    })
    return { applied: false as const, suggestion }
  }
)
