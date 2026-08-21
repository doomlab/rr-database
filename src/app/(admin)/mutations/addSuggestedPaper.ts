import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { fetchOrCreatePaperByDoi, normalizeDoi } from "src/lib/crossrefPaperLookup"
import { upsertAuthors } from "src/lib/zoteroImport"

const AddSuggestedPaper = z.object({
  suggestionId: z.number(),
  title: z.string(),
  authors: z.array(z.string()),
  year: z.number().nullable(),
  doi: z.string().nullable(),
  url: z.string().nullable(),
})

export default resolver.pipe(
  resolver.zod(AddSuggestedPaper),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ suggestionId, title, authors, year, doi, url }) => {
    if (!doi && !title) {
      throw new Error("Enter a DOI or a title.")
    }

    let paperId: number
    let resultTitle: string
    let created: boolean

    if (doi) {
      // DOI-driven: Crossref's data is treated as more authoritative than
      // whatever the suggester typed, mirroring the JMIR counterpart flow.
      const normalized = normalizeDoi(doi)
      const result = await fetchOrCreatePaperByDoi(normalized, { discoveredVia: "USER_SUGGESTION" })
      paperId = result.id
      resultTitle = result.title
      created = result.created
    } else {
      const existing = url
        ? await db.paper.findFirst({ where: { url }, select: { id: true, title: true } })
        : null

      if (existing) {
        paperId = existing.id
        resultTitle = existing.title
        created = false
      } else {
        const paper = await db.paper.create({
          data: {
            title,
            year,
            url,
            status: "PENDING_REVIEW",
            discoveredVia: ["USER_SUGGESTION"],
          },
        })
        paperId = paper.id
        resultTitle = paper.title
        created = true

        if (authors.length > 0) await upsertAuthors(paperId, authors)
      }
    }

    await db.articleSuggestion.update({ where: { id: suggestionId }, data: { resolved: true } })

    return { paperId, title: resultTitle, created }
  }
)
