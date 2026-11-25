import db from "db"
import { upsertAuthors } from "./zoteroImport"

// Lifecycle Journal has no API of its own and its article pages don't expose
// the underlying OSF links, but every article is a Crossref DOI under the
// Center for Open Science's 10.71240 prefix — so Crossref's prefix listing is
// a complete, key-less index of the journal (abstracts and ORCIDs included).
const PREFIX = "10.71240"
const ROWS = 100
const MAX_PAGES = 20
const HEADERS = { "User-Agent": "mailto:buchananlab@gmail.com" }
const SELECT = "DOI,title,type,abstract,author,published,publisher,resource,relation"

async function fetchWorks(): Promise<any[]> {
  const works: any[] = []
  let cursor = "*"

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`https://api.crossref.org/prefixes/${PREFIX}/works`)
    url.searchParams.set("rows", String(ROWS))
    url.searchParams.set("cursor", cursor)
    url.searchParams.set("select", SELECT)

    const res = await fetch(url.toString(), { headers: HEADERS })
    if (!res.ok) throw new Error(`Crossref lookup failed (${res.status})`)
    const { message } = await res.json()
    const items: any[] = message?.items ?? []
    works.push(...items)

    if (items.length < ROWS || !message["next-cursor"]) break
    cursor = message["next-cursor"]
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  return works
}

// Related DOIs (other versions of the same article, and any MetaROR-style
// reviews) kept so whoever links versions into a Study can see them.
function relatedDois(relation: Record<string, { id: string }[]> | undefined) {
  const out: Record<string, string[]> = {}
  for (const [kind, entries] of Object.entries(relation ?? {})) {
    out[kind] = entries.map((e) => e.id.toLowerCase())
  }
  return out
}

export async function discoverLifecycleJournalCandidates(): Promise<{
  found: number
  created: number
  skipped: number
}> {
  // The prefix also holds the journal's own record (type "journal"), which
  // isn't an article.
  const works = (await fetchWorks()).filter((w) => w.type === "posted-content" && w.title?.[0] && w.DOI)

  const dois = works.map((w) => (w.DOI as string).toLowerCase())
  const existing = await db.paper.findMany({ where: { doi: { in: dois } }, select: { doi: true } })
  const existingDois = new Set(existing.map((p) => p.doi).filter((d): d is string => !!d))

  let created = 0
  let skipped = 0

  for (const w of works) {
    const doi = (w.DOI as string).toLowerCase()
    // Deduped by DOI only, not title: each version of an article is its own
    // DOI and its own record, and the Link step groups them into one Study.
    if (existingDois.has(doi)) {
      skipped++
      continue
    }

    const paper = await db.paper.create({
      data: {
        title: w.title[0],
        doi,
        abstract: w.abstract ? w.abstract.replace(/<[^>]+>/g, "").trim() : null,
        year: w.published?.["date-parts"]?.[0]?.[0] ?? null,
        venue: "Lifecycle Journal",
        publisher: w.publisher ?? null,
        url: `https://doi.org/${doi}`,
        itemType: "article",
        openAccess: true,
        openAccessStatus: "diamond",
        status: "PENDING_REVIEW",
        discoveredVia: ["LIFECYCLE_JOURNAL"],
        sourceMetadata: {
          lifecycleJournal: { articleUrl: w.resource?.primary?.URL ?? null, related: relatedDois(w.relation) },
        },
      },
    })

    const authorInputs = ((w.author ?? []) as any[])
      .map((a) => {
        const name = [a.given, a.family].filter(Boolean).join(" ") || a.name
        return name ? { name, orcid: (a.ORCID as string | undefined) ?? null, openalexAuthorId: null } : null
      })
      .filter((a): a is { name: string; orcid: string | null; openalexAuthorId: null } => !!a)
    await upsertAuthors(paper.id, authorInputs)

    existingDois.add(doi)
    created++
  }

  return { found: works.length, created, skipped }
}
