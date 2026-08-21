import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const ResolveMetadataEdit = z.object({
  suggestionId: z.number(),
  apply: z.boolean(),
})

export default resolver.pipe(
  resolver.zod(ResolveMetadataEdit),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ suggestionId, apply }) => {
    const suggestion = await db.metadataEditSuggestion.findUniqueOrThrow({
      where: { id: suggestionId },
    })

    if (apply) {
      const {
        title,
        doi,
        abstract,
        year,
        venue,
        volume,
        issue,
        pages,
        publisher,
        url,
        issn,
        language,
        itemType,
        pdfUrl,
        openAccess,
        openAccessStatus,
        citedByCount,
        openalexId,
        registrationUrl,
        registrationPlatform,
        biasLevel,
        openDataUrl,
        openCodeUrl,
        openMaterialsUrl,
        zoteroNotes,
        tags,
        keywords,
        authors,
      } = suggestion
      const updates = Object.fromEntries(
        Object.entries({
          title,
          doi,
          abstract,
          year,
          venue,
          volume,
          issue,
          pages,
          publisher,
          url,
          issn,
          language,
          itemType,
          pdfUrl,
          openAccess,
          openAccessStatus,
          citedByCount,
          openalexId,
          registrationUrl,
          registrationPlatform,
          biasLevel,
          openDataUrl,
          openCodeUrl,
          openMaterialsUrl,
          zoteroNotes,
          ...(tags.length > 0 ? { tags } : {}),
          ...(keywords.length > 0 ? { keywords } : {}),
        }).filter(([, v]) => v !== null && v !== undefined)
      )

      const authorList = authors as unknown as { id: number | null; name: string }[]

      await db.$transaction(async (tx) => {
        if (Object.keys(updates).length > 0) {
          await tx.paper.update({ where: { id: suggestion.paperId }, data: updates })
        }
        if (authorList.length > 0) {
          await tx.paperAuthor.deleteMany({ where: { paperId: suggestion.paperId } })
          let position = 0
          for (const a of authorList) {
            const name = a.name.trim()
            if (!name) continue
            const author = a.id
              ? await tx.author.update({ where: { id: a.id }, data: { name } })
              : await tx.author.upsert({ where: { name }, create: { name }, update: {} })
            await tx.paperAuthor.create({ data: { paperId: suggestion.paperId, authorId: author.id, position } })
            position++
          }
        }
      })
    }

    return db.metadataEditSuggestion.update({
      where: { id: suggestionId },
      data: { resolved: true },
    })
  }
)
