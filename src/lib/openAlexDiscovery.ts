import db from "db"
import { withOpenAlexApiKey } from "./openAlexApiKey"
import { upsertAuthors } from "./zoteroImport"

const HEADERS = { "User-Agent": "mailto:buchananlab@gmail.com" }
const PER_PAGE = 200
// Safety cap on pages fetched per run (200 * 100 = 20,000 works) — cursor
// pagination has no hard cap like offset pagination does, but a runaway
// search (e.g. a bad date range) shouldn't be able to hang forever.
const MAX_PAGES = 100

// Quoted so OpenAlex matches the exact phrase, not documents containing the
// individual words separately.
const SEARCH_TERMS = [
  "registered report",
  "preregistered report",
  "pre-registered report",
  "preregistered research",
]

function searchQuery(): string {
  return SEARCH_TERMS.map((t) => `"${t}"`).join(" OR ")
}

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

async function fetchWorks(fromDate: string, toDate: string): Promise<any[]> {
  const works: any[] = []
  let cursor = "*"

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL("https://api.openalex.org/works")
    url.searchParams.set("search", searchQuery())
    url.searchParams.set("filter", `from_publication_date:${fromDate},to_publication_date:${toDate}`)
    url.searchParams.set("per_page", String(PER_PAGE))
    url.searchParams.set("cursor", cursor)

    const res = await fetch(await withOpenAlexApiKey(url.toString()), { headers: HEADERS })
    if (!res.ok) throw new Error(`OpenAlex search failed (${res.status})`)
    const data = await res.json()
    const batch: any[] = data.results ?? []
    works.push(...batch)

    const nextCursor = data.meta?.next_cursor
    if (!nextCursor || batch.length === 0) break
    cursor = nextCursor
    await new Promise((resolve) => setTimeout(resolve, 150))
  }

  return works
}

export async function discoverOpenAlexCandidates(
  fromDate: string,
  toDate: string
): Promise<{ found: number; created: number; skipped: number }> {
  const works = await fetchWorks(fromDate, toDate)

  const dois = works
    .map((w) => (w.doi as string | undefined)?.replace("https://doi.org/", "").toLowerCase())
    .filter((d): d is string => !!d)
  const openalexIds = works.map((w) => w.id as string).filter(Boolean)

  const existing = await db.paper.findMany({
    where: { OR: [{ doi: { in: dois } }, { openalexId: { in: openalexIds } }] },
    select: { doi: true, openalexId: true },
  })
  const existingDois = new Set(existing.map((p) => p.doi).filter((d): d is string => !!d))
  const existingOpenAlexIds = new Set(existing.map((p) => p.openalexId).filter((d): d is string => !!d))

  let created = 0
  let skipped = 0

  for (const w of works) {
    const doi = (w.doi as string | undefined)?.replace("https://doi.org/", "").toLowerCase() || null
    const openalexId = w.id as string

    if (!w.title || !openalexId || (doi && existingDois.has(doi)) || existingOpenAlexIds.has(openalexId)) {
      skipped++
      continue
    }

    const paper = await db.paper.create({
      data: {
        title: w.title,
        doi,
        abstract: reconstructAbstract(w.abstract_inverted_index),
        year: w.publication_year ?? null,
        venue: w.primary_location?.source?.display_name ?? null,
        url: w.primary_location?.landing_page_url ?? null,
        openalexId,
        citedByCount: w.cited_by_count ?? null,
        openAccess: w.open_access?.is_oa ?? null,
        openAccessStatus: w.open_access?.oa_status ?? null,
        pdfUrl: w.best_oa_location?.pdf_url ?? w.open_access?.oa_url ?? null,
        itemType: w.type ?? null,
        status: "PENDING_REVIEW",
        discoveredVia: ["OPENALEX"],
      },
    })

    const authorInputs = (w.authorships ?? [])
      .map((a: any) => {
        const name = a.author?.display_name
        if (!name) return null
        return {
          name,
          orcid: a.author?.orcid ?? null,
          openalexAuthorId: a.author?.id ? String(a.author.id).replace("https://openalex.org/", "") : null,
        }
      })
      .filter((a: unknown): a is { name: string; orcid: string | null; openalexAuthorId: string | null } => !!a)
    await upsertAuthors(paper.id, authorInputs)

    if (doi) existingDois.add(doi)
    existingOpenAlexIds.add(openalexId)
    created++
  }

  return { found: works.length, created, skipped }
}
