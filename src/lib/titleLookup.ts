import { withOpenAlexApiKey } from "./openAlexApiKey"
import { normalizeDoi } from "./crossrefPaperLookup"
import { titleSimilarity } from "./duplicateClusters"

const HEADERS = { "User-Agent": "mailto:buchananlab@gmail.com" }
const RESULTS_PER_SOURCE = 5
// Below this the match is more likely coincidental shared topic words than
// the same paper, so it isn't worth showing.
const MIN_SCORE = 0.4

export type TitleCandidate = {
  source: "openalex" | "crossref"
  doi: string
  title: string
  year: number | null
  venue: string | null
  authors: string[]
  // 0-1 similarity of this candidate's title to the one searched for.
  score: number
}

async function searchOpenAlex(title: string): Promise<Omit<TitleCandidate, "score">[]> {
  const url = new URL("https://api.openalex.org/works")
  url.searchParams.set("search", title)
  url.searchParams.set("per_page", String(RESULTS_PER_SOURCE))
  url.searchParams.set("select", "doi,title,publication_year,authorships,primary_location")

  const res = await fetch(await withOpenAlexApiKey(url.toString()), { headers: HEADERS })
  if (!res.ok) throw new Error(`OpenAlex search failed (${res.status})`)
  const data = await res.json()

  return (data.results ?? [])
    .filter((w: any) => w.doi && w.title)
    .map((w: any) => ({
      source: "openalex" as const,
      doi: normalizeDoi(w.doi),
      title: w.title,
      year: w.publication_year ?? null,
      venue: w.primary_location?.source?.display_name ?? null,
      authors: (w.authorships ?? []).map((a: any) => a.author?.display_name).filter(Boolean),
    }))
}

async function searchCrossref(title: string, authors: string[]): Promise<Omit<TitleCandidate, "score">[]> {
  const url = new URL("https://api.crossref.org/works")
  url.searchParams.set("query.bibliographic", title)
  if (authors[0]) url.searchParams.set("query.author", authors[0])
  url.searchParams.set("rows", String(RESULTS_PER_SOURCE))
  url.searchParams.set("select", "DOI,title,issued,author,container-title")

  const res = await fetch(url.toString(), { headers: HEADERS })
  if (!res.ok) throw new Error(`Crossref search failed (${res.status})`)
  const { message } = await res.json()

  return (message?.items ?? [])
    .filter((i: any) => i.DOI && i.title?.[0])
    .map((i: any) => ({
      source: "crossref" as const,
      doi: normalizeDoi(i.DOI),
      title: i.title[0],
      year: i.issued?.["date-parts"]?.[0]?.[0] ?? null,
      venue: i["container-title"]?.[0] ?? null,
      authors: (i.author ?? [])
        .map((a: any) => [a.given, a.family].filter(Boolean).join(" ") || a.name)
        .filter(Boolean),
    }))
}

// Fuzzy title search for papers that have no DOI to look up directly. Queries
// OpenAlex (if `useOpenAlex`) and Crossref, scores every hit against the
// searched title, and returns the plausible ones best-first, one per DOI. A
// source that errors is reported in `errors` rather than failing the whole
// search, since either one alone is often enough.
export async function findWorksByTitle(
  title: string,
  opts: { authors?: string[]; useOpenAlex: boolean }
): Promise<{ candidates: TitleCandidate[]; errors: string[] }> {
  const sources = [
    ...(opts.useOpenAlex ? [{ name: "OpenAlex", run: () => searchOpenAlex(title) }] : []),
    { name: "Crossref", run: () => searchCrossref(title, opts.authors ?? []) },
  ]
  const settled = await Promise.allSettled(sources.map((s) => s.run()))

  const errors: string[] = []
  const byDoi = new Map<string, TitleCandidate>()
  settled.forEach((r, i) => {
    if (r.status === "rejected") {
      errors.push(`${sources[i]!.name}: ${r.reason?.message ?? "search failed"}`)
      return
    }
    for (const c of r.value) {
      const score = titleSimilarity(title, c.title)
      if (score < MIN_SCORE) continue
      const prev = byDoi.get(c.doi)
      if (!prev || score > prev.score) byDoi.set(c.doi, { ...c, score })
    }
  })

  return { candidates: [...byDoi.values()].sort((a, b) => b.score - a.score), errors }
}

// Minimum title similarity for treating a search hit as the same paper, and
// the most the publication years may differ by (preprint vs. published
// versions are often a year apart).
const CONFIDENT_SCORE = 0.8
const MAX_YEAR_GAP = 1

export type TitleHint = { title: string; year: number | null; firstAuthor: string | null }

// Picks the single best DOI for a paper that has none, or null if nothing is
// confidently the same work. A preprint and its published version share a
// title, so ties go to the closest year rather than being treated as
// ambiguous.
export async function lookupDoiByTitle(
  hint: TitleHint,
  opts: { useOpenAlex: boolean }
): Promise<{ doi: string; title: string; score: number; source: TitleCandidate["source"] } | null> {
  const { candidates } = await findWorksByTitle(hint.title, {
    authors: hint.firstAuthor ? [hint.firstAuthor] : [],
    useOpenAlex: opts.useOpenAlex,
  })

  const gap = (c: TitleCandidate) => (hint.year != null && c.year != null ? Math.abs(c.year - hint.year) : 0)
  const best = candidates
    .filter((c) => c.score >= CONFIDENT_SCORE && gap(c) <= MAX_YEAR_GAP)
    .sort((a, b) => b.score - a.score || gap(a) - gap(b))[0]

  return best ? { doi: best.doi, title: best.title, score: best.score, source: best.source } : null
}
