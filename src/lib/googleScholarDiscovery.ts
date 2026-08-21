import { execFile } from "node:child_process"
import { promisify } from "node:util"
import db from "db"
import { findMatchingPaper } from "./duplicateClusters"
import { upsertAuthors } from "./zoteroImport"

const execFileAsync = promisify(execFile)

// scholarly does unofficial, unauthenticated scraping of Google Scholar (no
// API/key), which risks CAPTCHAs/IP blocks under sustained use — so this
// stays capped rather than pulling everything. Scholar ranks by relevance
// (roughly: citation count), so the first page or two skew toward
// well-known papers that are also the ones most likely already in OpenAlex;
// going a few pages deeper is where Scholar actually earns its place
// (theses, smaller venues, low-citation items OpenAlex missed), hence 50
// rather than just enough for one page.
const MAX_RESULTS = 50

type ScholarResult = {
  title: string | null
  authors: string[] | null
  venue: string | null
  year: string | number | null
  abstract: string | null
  url: string | null
  doi: string | null
  cited_by: number | null
}

async function fetchResults(year: number): Promise<ScholarResult[]> {
  const { stdout } = await execFileAsync(
    "python3",
    ["scripts/query_google_scholar.py", "--year", String(year), "--max-results", String(MAX_RESULTS), "--stdout-json"],
    { cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024, timeout: 120_000 }
  )
  const lastLine = stdout.trim().split("\n").pop() ?? "{}"
  const data = JSON.parse(lastLine)
  return data.results ?? []
}

export async function discoverGoogleScholarCandidates(
  year: number
): Promise<{ found: number; created: number; skipped: number }> {
  const results = await fetchResults(year)

  let created = 0
  let skipped = 0

  for (const r of results) {
    if (!r.title) {
      skipped++
      continue
    }

    const doi = r.doi?.replace("https://doi.org/", "").toLowerCase() || null

    const existing = doi
      ? await db.paper.findFirst({ where: { doi }, select: { id: true } })
      : null
    if (existing) {
      skipped++
      continue
    }

    // Google Scholar heavily overlaps with what's already been pulled from
    // OpenAlex/Zotero, and often has no DOI to dedup on directly — fall back
    // to a title match against the existing database before creating a new
    // candidate.
    const titleMatch = await findMatchingPaper(r.title)
    if (titleMatch) {
      skipped++
      continue
    }

    const paper = await db.paper.create({
      data: {
        title: r.title,
        doi,
        abstract: r.abstract,
        year: r.year ? Number(r.year) : null,
        venue: r.venue && r.venue !== "NA" ? r.venue : null,
        url: r.url,
        citedByCount: r.cited_by ?? null,
        status: "PENDING_REVIEW",
        discoveredVia: ["GOOGLE_SCHOLAR"],
      },
    })

    const authorInputs = (r.authors ?? []).map((name) => ({
      name,
      orcid: null,
      openalexAuthorId: null,
    }))
    await upsertAuthors(paper.id, authorInputs)

    created++
  }

  return { found: results.length, created, skipped }
}
