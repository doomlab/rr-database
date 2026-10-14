import db from "db"
import { findMatchingPaper } from "./duplicateClusters"
import { upsertAuthors } from "./zoteroImport"

const BASE_URL = "https://api.clarivate.com/apis/wos-starter/v1/documents"
const PER_PAGE = 50 // Starter API maximum
// The free trial tier is 1 request/second and 50 requests/day per key, so a
// run is paced at just over a second per call and capped well under a day's
// quota — one year of RR papers should fit in a handful of pages anyway.
const MAX_PAGES = 20
const REQUEST_GAP_MS = 1100

// Quoted so WoS matches the exact phrase. TS searches title, abstract, author
// keywords and Keywords Plus.
const SEARCH_TERMS = [
  "registered report",
  "preregistered report",
  "pre-registered report",
  "preregistered research",
]

// The Starter API doesn't return abstracts, so the IRRID boilerplate filter
// used for OpenAlex (clinical-trial protocols whose abstract contains
// "INTERNATIONAL REGISTERED REPORT IDENTIFIER") can't be applied. Those are
// almost all JMIR-family journals, so for those venues we require the title
// itself to contain one of our terms.
const NOISY_VENUE = /^jmir\b/i

function query(year: number): string {
  const terms = SEARCH_TERMS.map((t) => `"${t}"`).join(" OR ")
  return `TS=(${terms}) AND PY=${year}`
}

function isLikelyMatch(title: string, venue: string | null): boolean {
  if (!venue || !NOISY_VENUE.test(venue)) return true
  const lower = title.toLowerCase()
  return SEARCH_TERMS.some((t) => lower.includes(t))
}

// WoS displays authors as "Chambers, Christopher D." — flip to "First Last"
// to match how names from the other sources are stored.
function normalizeAuthorName(displayName: string): string {
  const [last, first] = displayName.split(",").map((s) => s.trim())
  return first ? `${first} ${last}` : displayName.trim()
}

async function fetchHits(year: number, apiKey: string): Promise<{ hits: any[]; total: number }> {
  const hits: any[] = []
  let total = 0

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = new URL(BASE_URL)
    url.searchParams.set("db", "WOS")
    url.searchParams.set("q", query(year))
    url.searchParams.set("limit", String(PER_PAGE))
    url.searchParams.set("page", String(page))

    const res = await fetch(url.toString(), { headers: { "X-ApiKey": apiKey } })
    if (res.status === 401 || res.status === 403) {
      throw new Error("Web of Science rejected your API key. Check the key on your Account page.")
    }
    if (res.status === 429) {
      throw new Error(
        "Web of Science rate limit reached (the free tier allows 50 requests per day). Try again tomorrow."
      )
    }
    if (!res.ok) throw new Error(`Web of Science search failed (${res.status})`)

    const data = await res.json()
    const batch: any[] = data.hits ?? []
    total = data.metadata?.total ?? total
    hits.push(...batch)

    if (batch.length < PER_PAGE || hits.length >= total) break
    await new Promise((resolve) => setTimeout(resolve, REQUEST_GAP_MS))
  }

  return { hits, total }
}

export async function discoverWebOfScienceCandidates(
  year: number,
  apiKey: string
): Promise<{ found: number; total: number; created: number; skipped: number }> {
  const { hits, total } = await fetchHits(year, apiKey)

  let created = 0
  let skipped = 0

  for (const h of hits) {
    const title: string | undefined = h.title
    const doi = (h.identifiers?.doi as string | undefined)?.replace(/^https?:\/\/doi\.org\//i, "").toLowerCase() || null
    const venue: string | null = h.source?.sourceTitle ?? null

    if (!title || !isLikelyMatch(title, venue)) {
      skipped++
      continue
    }

    const existing = doi ? await db.paper.findFirst({ where: { doi }, select: { id: true } }) : null
    // WoS overlaps heavily with OpenAlex/Zotero and some records have no DOI —
    // fall back to a title match before creating a new candidate.
    if (existing || (await findMatchingPaper(title))) {
      skipped++
      continue
    }

    const paper = await db.paper.create({
      data: {
        title,
        doi,
        year: h.source?.publishYear ?? null,
        venue,
        volume: h.source?.volume ?? null,
        issue: h.source?.issue ?? null,
        pages: h.source?.pages?.range ?? null,
        issn: h.identifiers?.issn ?? h.identifiers?.eissn ?? null,
        url: doi ? `https://doi.org/${doi}` : h.links?.record ?? null,
        itemType: h.types?.[0]?.toLowerCase() ?? null,
        status: "PENDING_REVIEW",
        discoveredVia: ["WEB_OF_SCIENCE"],
        sourceMetadata: {
          webOfScience: { uid: h.uid ?? null, types: h.types ?? [], authorKeywords: h.keywords?.authorKeywords ?? [] },
        },
      },
    })

    const authorInputs = ((h.names?.authors ?? []) as any[])
      .filter((a) => a.displayName)
      .map((a) => ({ name: normalizeAuthorName(a.displayName), orcid: null, openalexAuthorId: null }))
    await upsertAuthors(paper.id, authorInputs)

    created++
  }

  return { found: hits.length, total, created, skipped }
}
