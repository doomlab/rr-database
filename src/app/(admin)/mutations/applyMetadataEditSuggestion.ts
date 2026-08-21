import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const AuthorInput = z.object({ id: z.number().nullable(), name: z.string() })

const ApplyMetadataEditSuggestion = z.object({
  suggestionId: z.number(),
  title: z.string().nullable(),
  authors: z.array(AuthorInput),
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
  jmirBadgeType: z.string().nullable(),
  jmirBadgeCounterpartDoi: z.string().nullable(),
  tags: z.array(z.string()),
  keywords: z.array(z.string()),
  markVerified: z.boolean().optional(),
})

export default resolver.pipe(
  resolver.zod(ApplyMetadataEditSuggestion),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ suggestionId, authors, markVerified, ...fields }, ctx) => {
    const userId = ctx.session.userId as number
    const suggestion = await db.metadataEditSuggestion.findUniqueOrThrow({ where: { id: suggestionId } })

    const updated = await db.$transaction(async (tx) => {
      const updates: Record<string, unknown> = Object.fromEntries(
        Object.entries(fields).filter(([, v]) => v !== null)
      )
      if (fields.jmirBadgeType) {
        updates.jmirBadgeCheckedAt = new Date()
      }
      if (markVerified) {
        updates.metadataVerifiedById = userId
        updates.metadataVerifiedAt = new Date()
      }

      const paper = await tx.paper.update({ where: { id: suggestion.paperId }, data: updates })
      await tx.paperEditHistory.create({
        data: {
          paperId: suggestion.paperId,
          userId,
          source: "manual",
          summary: `Applied suggestion from user #${suggestion.userId}`,
        },
      })

      await tx.paperAuthor.deleteMany({ where: { paperId: suggestion.paperId } })
      let position = 0
      for (const a of authors) {
        const name = a.name.trim()
        if (!name) continue
        const author = a.id
          ? await tx.author.update({ where: { id: a.id }, data: { name } })
          : await tx.author.upsert({ where: { name }, create: { name }, update: {} })
        await tx.paperAuthor.create({ data: { paperId: suggestion.paperId, authorId: author.id, position } })
        position++
      }

      await tx.metadataEditSuggestion.update({ where: { id: suggestionId }, data: { resolved: true } })

      return paper
    })

    return { paperId: updated.id, title: updated.title }
  }
)
