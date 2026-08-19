import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { fetchCrossrefFields, fetchOpenAlexFields } from "src/lib/enrichment"

const PreviewEnrichment = z.object({
  paperId: z.number(),
  source: z.enum(["openalex", "crossref"]),
})

export default resolver.pipe(
  resolver.zod(PreviewEnrichment),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ paperId, source }) => {
    const paper = await db.paper.findUniqueOrThrow({ where: { id: paperId } })
    const fetched = source === "openalex" ? await fetchOpenAlexFields(paper) : await fetchCrossrefFields(paper)

    return {
      fetched,
      current: {
        title: paper.title,
        doi: paper.doi,
        abstract: paper.abstract,
        year: paper.year,
        venue: paper.venue,
        volume: paper.volume,
        issue: paper.issue,
        pages: paper.pages,
        issn: paper.issn,
        publisher: paper.publisher,
        language: paper.language,
        url: paper.url,
        pdfUrl: paper.pdfUrl,
        openAccess: paper.openAccess,
        openAccessStatus: paper.openAccessStatus,
        citedByCount: paper.citedByCount,
        openalexId: paper.openalexId,
      },
    }
  }
)
