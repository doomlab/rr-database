import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { withOpenAlexApiKey } from "src/lib/openAlexApiKey"

const HEADERS = { "User-Agent": "mailto:buchananlab@gmail.com" }

const EnrichFromOpenAlex = z.object({
  paperId: z.number(),
})

function reconstructAbstract(invertedIndex: Record<string, number[]> | null | undefined): string | null {
  if (!invertedIndex) return null
  const positions: [number, string][] = []
  for (const [word, idxs] of Object.entries(invertedIndex)) {
    for (const i of idxs) positions.push([i, word])
  }
  if (positions.length === 0) return null
  positions.sort((a, b) => a[0] - b[0])
  return positions.map(([, w]) => w).join(" ")
}

function extractShortOpenAlexId(openalexId: string): string | null {
  const match = openalexId.match(/W\d+/)
  return match ? match[0] : null
}

export default resolver.pipe(
  resolver.zod(EnrichFromOpenAlex),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ paperId }) => {
    const paper = await db.paper.findUniqueOrThrow({ where: { id: paperId } })

    let lookupPath: string | null = null
    if (paper.doi) {
      lookupPath = `doi:${encodeURIComponent(paper.doi)}`
    } else if (paper.openalexId) {
      const shortId = extractShortOpenAlexId(paper.openalexId)
      if (shortId) lookupPath = shortId
    }

    if (!lookupPath) {
      throw new Error("Paper has no DOI or OpenAlex ID to look it up by")
    }

    const res = await fetch(
      withOpenAlexApiKey(
        `https://api.openalex.org/works/${lookupPath}?select=id,abstract_inverted_index,best_oa_location,open_access,cited_by_count,primary_location`
      ),
      { headers: HEADERS }
    )

    if (!res.ok) {
      throw new Error(`OpenAlex lookup failed (${res.status})`)
    }

    const data = await res.json()

    const pdfUrl: string | null = data.best_oa_location?.pdf_url ?? data.open_access?.oa_url ?? null
    const openAccess: boolean | null = data.open_access?.is_oa ?? null
    const citedByCount: number | null = data.cited_by_count ?? null
    const venue: string | null = data.primary_location?.source?.display_name ?? null
    const abstract = paper.abstract ?? reconstructAbstract(data.abstract_inverted_index)
    const openalexId: string | null = paper.openalexId ?? data.id ?? null

    return db.paper.update({
      where: { id: paperId },
      data: {
        pdfUrl: pdfUrl ?? paper.pdfUrl,
        openAccess: openAccess ?? paper.openAccess,
        citedByCount: citedByCount ?? paper.citedByCount,
        venue: paper.venue ?? venue,
        abstract,
        openalexId,
        openAlexFetchedAt: new Date(),
      },
    })
  }
)
