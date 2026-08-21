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
      if (Object.keys(updates).length > 0) {
        await db.paper.update({ where: { id: suggestion.paperId }, data: updates })
      }
    }

    return db.metadataEditSuggestion.update({
      where: { id: suggestionId },
      data: { resolved: true },
    })
  }
)
