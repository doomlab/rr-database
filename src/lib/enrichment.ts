import { withOpenAlexApiKey } from "./openAlexApiKey"

const HEADERS = { "User-Agent": "mailto:buchananlab@gmail.com" }

export type FetchedAuthor = { name: string; orcid: string | null; openalexAuthorId: string | null }

export type EnrichmentFields = {
  title?: string | null
  year?: number | null
  venue?: string | null
  volume?: string | null
  issue?: string | null
  pages?: string | null
  issn?: string | null
  publisher?: string | null
  abstract?: string | null
  pdfUrl?: string | null
  openAccess?: boolean | null
  openAccessStatus?: string | null
  citedByCount?: number | null
  openalexId?: string | null
  keywords?: string[] | null
  authors?: FetchedAuthor[] | null
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

function extractShortOpenAlexId(openalexId: string): string | null {
  const match = openalexId.match(/W\d+/)
  return match ? match[0] : null
}

export async function fetchOpenAlexFields(paper: {
  doi: string | null
  openalexId: string | null
}): Promise<EnrichmentFields> {
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
    await withOpenAlexApiKey(
      `https://api.openalex.org/works/${lookupPath}?select=id,title,publication_year,abstract_inverted_index,best_oa_location,open_access,cited_by_count,primary_location,keywords,authorships`
      // open_access includes { is_oa, oa_status, oa_url }
    ),
    { headers: HEADERS }
  )

  if (!res.ok) {
    throw new Error(`OpenAlex lookup failed (${res.status})`)
  }

  const data = await res.json()

  return {
    title: data.title ?? null,
    year: data.publication_year ?? null,
    pdfUrl: data.best_oa_location?.pdf_url ?? data.open_access?.oa_url ?? null,
    openAccess: data.open_access?.is_oa ?? null,
    openAccessStatus: data.open_access?.oa_status ?? null,
    citedByCount: data.cited_by_count ?? null,
    venue: data.primary_location?.source?.display_name ?? null,
    abstract: reconstructAbstract(data.abstract_inverted_index),
    openalexId: data.id ?? null,
    keywords: Array.isArray(data.keywords)
      ? data.keywords
          .map((k: { display_name?: string }) => k.display_name?.toLowerCase().trim())
          .filter((k: string | undefined): k is string => !!k)
      : null,
    authors: Array.isArray(data.authorships)
      ? data.authorships
          .map((a: any) => {
            const name = a.author?.display_name
            if (!name) return null
            return {
              name,
              orcid: a.author?.orcid ?? null,
              openalexAuthorId: a.author?.id
                ? String(a.author.id).replace("https://openalex.org/", "")
                : null,
            }
          })
          .filter((a: FetchedAuthor | null): a is FetchedAuthor => !!a)
      : null,
  }
}

export async function fetchCrossrefFields(paper: { doi: string | null }): Promise<EnrichmentFields> {
  if (!paper.doi) {
    throw new Error("Paper has no DOI to look it up by")
  }

  const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(paper.doi)}`, {
    headers: HEADERS,
  })

  if (!res.ok) {
    throw new Error(`Crossref lookup failed (${res.status})`)
  }

  const { message } = await res.json()

  return {
    title: Array.isArray(message.title) ? message.title[0] ?? null : null,
    year:
      message.published?.["date-parts"]?.[0]?.[0] ??
      message["published-print"]?.["date-parts"]?.[0]?.[0] ??
      message["published-online"]?.["date-parts"]?.[0]?.[0] ??
      null,
    venue: message["container-title"]?.[0] ?? null,
    volume: message.volume ?? null,
    issue: message.issue ?? null,
    pages: message.page ?? null,
    issn: message.ISSN?.[0] ?? null,
    publisher: message.publisher ?? null,
    abstract: message.abstract ? message.abstract.replace(/<[^>]+>/g, "").trim() : null,
    authors: Array.isArray(message.author)
      ? message.author
          .map((a: any) => {
            const name = [a.given, a.family].filter(Boolean).join(" ") || a.name
            if (!name) return null
            return {
              name,
              orcid: a.ORCID ?? null,
              openalexAuthorId: null,
            }
          })
          .filter((a: FetchedAuthor | null): a is FetchedAuthor => !!a)
      : null,
  }
}
