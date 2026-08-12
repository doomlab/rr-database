import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const ResolveExtractionEdit = z.object({
  suggestionId: z.number(),
  apply: z.boolean(),
})

export default resolver.pipe(
  resolver.zod(ResolveExtractionEdit),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ suggestionId, apply }, ctx) => {
    const suggestion = await db.extractionEditSuggestion.findUniqueOrThrow({
      where: { id: suggestionId },
    })

    if (apply) {
      const existing = await db.paperExtraction.findUnique({ where: { paperId: suggestion.paperId } })
      const mergedData = {
        ...(existing?.extractedData as object | undefined),
        ...(suggestion.suggestedData as object),
      }
      await db.paperExtraction.upsert({
        where: { paperId: suggestion.paperId },
        create: {
          paperId: suggestion.paperId,
          extractedData: mergedData,
          needsReview: false,
          verifiedById: ctx.session.userId as number,
          verifiedAt: new Date(),
        },
        update: {
          extractedData: mergedData,
          needsReview: false,
          verifiedById: ctx.session.userId as number,
          verifiedAt: new Date(),
        },
      })
    }

    return db.extractionEditSuggestion.update({
      where: { id: suggestionId },
      data: { resolved: true },
    })
  }
)
