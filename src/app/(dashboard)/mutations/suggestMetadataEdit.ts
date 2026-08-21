import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const SuggestMetadataEdit = z.object({
  paperId: z.number(),
  title: z.string().nullable(),
  authors: z.array(z.string()),
  doi: z.string().nullable(),
  abstract: z.string().nullable(),
  year: z.number().nullable(),
  venue: z.string().nullable(),
  volume: z.string().nullable(),
  issue: z.string().nullable(),
  pages: z.string().nullable(),
  publisher: z.string().nullable(),
  url: z.string().nullable(),
  issn: z.string().nullable(),
  language: z.string().nullable(),
  itemType: z.string().nullable(),
  pdfUrl: z.string().nullable(),
  openAccess: z.boolean().nullable(),
  openAccessStatus: z.string().nullable(),
  citedByCount: z.number().nullable(),
  openalexId: z.string().nullable(),
  registrationUrl: z.string().nullable(),
  registrationPlatform: z.string().nullable(),
  biasLevel: z.string().nullable(),
  openDataUrl: z.string().nullable(),
  openCodeUrl: z.string().nullable(),
  openMaterialsUrl: z.string().nullable(),
  zoteroNotes: z.string().nullable(),
  tags: z.array(z.string()),
  keywords: z.array(z.string()),
  note: z.string().max(1000).nullable(),
  markVerified: z.boolean().optional(),
})

export default resolver.pipe(
  resolver.zod(SuggestMetadataEdit),
  resolver.authorize(),
  async ({ paperId, note, markVerified, authors, ...fields }, ctx) => {
    const userId = ctx.session.userId as number
    const isAdmin = ctx.session.role === "ADMIN" || ctx.session.role === "SUPER_ADMIN"

    if (isAdmin) {
      const updated = await db.$transaction(async (tx) => {
        const updates: Record<string, unknown> = Object.fromEntries(
          Object.entries(fields).filter(([, v]) => v !== null)
        )
        if (markVerified) {
          updates.metadataVerifiedById = userId
          updates.metadataVerifiedAt = new Date()
        }

        const paper = await tx.paper.update({ where: { id: paperId }, data: updates })
        await tx.paperEditHistory.create({
          data: { paperId, userId, source: "manual", summary: note ?? undefined },
        })

        await tx.paperAuthor.deleteMany({ where: { paperId } })
        let position = 0
        for (const rawName of authors) {
          const name = rawName.trim()
          if (!name) continue
          const author = await tx.author.upsert({ where: { name }, create: { name }, update: {} })
          await tx.paperAuthor.create({ data: { paperId, authorId: author.id, position } })
          position++
        }

        return paper
      })
      return { applied: true as const, paper: updated }
    }

    const suggestion = await db.metadataEditSuggestion.upsert({
      where: { userId_paperId: { userId, paperId } },
      create: { userId, paperId, note, authors, ...fields },
      update: { note, authors, ...fields, resolved: false },
    })
    return { applied: false as const, suggestion }
  }
)
