import db from "db"
import { withOpenAlexApiKey } from "./openAlexApiKey"
import { upsertAuthors } from "./zoteroImport"
import { detectPcirrDocument, findMatchingPaper, isPcirrWork } from "./pcirr"
import { STUDY_PAPER_ROLE_LABELS } from "./studyPaperRoles"

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

// Many clinical-trial protocol papers (mostly JMIR-family journals) carry the
// boilerplate line "INTERNATIONAL REGISTERED REPORT IDENTIFIER (IRRID): RR..."
// in their abstract. That phrase contains "registered report" and matches our
// search even though it has nothing to do with the Registered Reports
// publishing format. OpenAlex search filters don't support `!` negation, so
// we can't exclude this at the API level — instead we treat a work as a real
// match only if its title actually contains one of our terms, or its abstract
// doesn't contain the IRRID boilerplate.
const IRRID_BOILERPLATE = "international registered report identifier"

function searchQuery(): string {
  return SEARCH_TERMS.map((t) => `"${t}"`).join("|")
}

function isLikelyMatch(title: string | null | undefined, abstract: string | null): boolean {
  const titleLower = (title ?? "").toLowerCase()
  if (SEARCH_TERMS.some((t) => titleLower.includes(t))) return true
  return !(abstract ?? "").toLowerCase().includes(IRRID_BOILERPLATE)
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
    url.searchParams.set(
      "filter",
      `from_publication_date:${fromDate},to_publication_date:${toDate},title_and_abstract.search:${searchQuery()}`
    )
    url.searchParams.set("per_page", String(PER_PAGE))
    url.searchParams.set("cursor", cursor)

    const res = await fetch(await withOpenAlexApiKey(url.toString()), { headers: HEADERS })
    if (!res.ok) throw new Error(`OpenAlex search failed (${res.status})`)
    const data = await res.json()
    const rawBatch: any[] = data.results ?? []
    const batch = rawBatch.filter((w: any) =>
      isLikelyMatch(w.title, reconstructAbstract(w.abstract_inverted_index))
    )
    works.push(...batch)

    const nextCursor = data.meta?.next_cursor
    if (!nextCursor || rawBatch.length === 0) break
    cursor = nextCursor
    await new Promise((resolve) => setTimeout(resolve, 150))
  }

  return works
}

export async function discoverOpenAlexCandidates(
  fromDate: string,
  toDate: string,
  userId: number
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

    const venue = w.primary_location?.source?.display_name ?? null
    const isPcirr = isPcirrWork(doi, venue)
    const pcirrDoc = isPcirr ? detectPcirrDocument(w.title) : null

    const paper = await db.paper.create({
      data: {
        title: w.title,
        doi,
        abstract: reconstructAbstract(w.abstract_inverted_index),
        year: w.publication_year ?? null,
        venue,
        url: w.primary_location?.landing_page_url ?? null,
        openalexId,
        citedByCount: w.cited_by_count ?? null,
        openAccess: w.open_access?.is_oa ?? null,
        openAccessStatus: w.open_access?.oa_status ?? null,
        pdfUrl: w.best_oa_location?.pdf_url ?? w.open_access?.oa_url ?? null,
        itemType: w.type ?? null,
        status: "PENDING_REVIEW",
        discoveredVia: isPcirr ? ["OPENALEX", "PCIRR"] : ["OPENALEX"],
        pcirrMetadata: pcirrDoc ? { role: pcirrDoc.role, strippedTitle: pcirrDoc.strippedTitle } : undefined,
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

    // A PCI RR review/author-response/decision/recommendation is a document
    // *about* an existing study, not a new candidate paper — if we can
    // confidently match it to the original article already in the database,
    // link it straight into that study with the right role instead of
    // leaving it to be manually linked later.
    if (pcirrDoc) {
      const match = await findMatchingPaper(pcirrDoc.strippedTitle)
      if (match) {
        const studyId = match.studyPaper?.studyId ?? (await db.study.create({ data: {} })).id
        if (!match.studyPaper) {
          await db.studyPaper.create({ data: { studyId, paperId: match.id, role: "OTHER" } })
        }
        await db.studyPaper.create({ data: { studyId, paperId: paper.id, role: pcirrDoc.role } })
        await db.paperEditHistory.create({
          data: {
            paperId: paper.id,
            userId,
            source: "openalex",
            summary: `Auto-linked as ${STUDY_PAPER_ROLE_LABELS[pcirrDoc.role]} with paper #${match.id} ("${match.title}") by title match`,
          },
        })
      }
    }

    if (doi) existingDois.add(doi)
    existingOpenAlexIds.add(openalexId)
    created++
  }

  return { found: works.length, created, skipped }
}
