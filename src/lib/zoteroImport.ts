import db, { Prisma } from "db"

const HEADERS_BASE = { "User-Agent": "mailto:buchananlab@gmail.com" }
const OPENALEX_ID_RE = /OpenAlex ID:\s*(\S+)/

type ZoteroItem = {
  key: string
  version: number
  data: Record<string, any>
}

async function zoteroGetAll(path: string, apiKey: string, params: Record<string, string> = {}) {
  const results: ZoteroItem[] = []
  let start = 0
  for (;;) {
    const url = new URL(`https://api.zotero.org${path}`)
    for (const [k, v] of Object.entries({ ...params, limit: "100", start: String(start) })) {
      url.searchParams.set(k, v)
    }
    const res = await fetch(url.toString(), {
      headers: { ...HEADERS_BASE, "Zotero-API-Key": apiKey },
    })
    if (!res.ok) throw new Error(`Zotero API error (${res.status}) at ${path}`)
    const batch: ZoteroItem[] = await res.json()
    if (batch.length === 0) break
    results.push(...batch)
    start += batch.length
  }
  return results
}

function extractYear(dateStr: string | undefined | null): number | null {
  if (!dateStr) return null
  const match = dateStr.match(/\d{4}/)
  return match ? Number(match[0]) : null
}

function extractOpenAlexId(extra: string | undefined | null): string | null {
  if (!extra) return null
  const match = extra.match(OPENALEX_ID_RE)
  return match ? match[1]! : null
}

// Zotero tags carry a `type` key only when automatic (type: 1 — e.g. MeSH
// keywords pulled in from imported metadata); a manually-added tag (what the
// coders actually applied — "Stage 1 Manuscript", "Open Data", journal
// abbreviations, etc.) omits `type` entirely. That's the only signal the API
// gives us to tell them apart, so it's what we filter on.
function extractManualTags(tags: any[] | undefined | null): string[] {
  return (tags ?? [])
    .filter((t) => t.type === undefined || t.type === 0)
    .map((t) => t.tag as string)
    .filter(Boolean)
}

// Coders' stage tags aren't uniformly named ("Stage 1 Manuscript", "JMIR:
// Stage 2 Only", "cambrige stage 2" (typo, kept as-is in Zotero)) so this
// matches on the "stage 1"/"stage 2" substring rather than an exact string.
// Tags noting an *absent* counterpart ("Stage 1 Not Found") are excluded so
// they don't get read as asserting the paper's own stage. If tags assert
// both stages, or neither, this returns null rather than guessing.
const STAGE_EXCLUDE_RE = /not found|missing/i
const STAGE_1_RE = /\bstage\s*1\b/i
const STAGE_2_RE = /\bstage\s*2\b/i

function detectStage(manualTags: string[]): "STAGE_1" | "STAGE_2" | null {
  const relevant = manualTags.filter((t) => !STAGE_EXCLUDE_RE.test(t))
  const hasStage1 = relevant.some((t) => STAGE_1_RE.test(t))
  const hasStage2 = relevant.some((t) => STAGE_2_RE.test(t))
  if (hasStage1 && !hasStage2) return "STAGE_1"
  if (hasStage2 && !hasStage1) return "STAGE_2"
  return null
}

function extractAuthorNames(creators: any[] | undefined | null): string[] {
  const names: string[] = []
  for (const c of creators ?? []) {
    if (c.name) {
      names.push(c.name)
    } else {
      const full = [c.firstName, c.lastName].filter(Boolean).join(" ")
      if (full) names.push(full)
    }
  }
  return names
}

export async function upsertAuthors(paperId: number, authorNames: string[]) {
  await db.paperAuthor.deleteMany({ where: { paperId } })
  const deduped = [...new Set(authorNames)]

  for (let position = 0; position < deduped.length; position++) {
    const name = deduped[position]!
    const author = await db.author.upsert({
      where: { name },
      update: {},
      create: { name },
    })
    await db.paperAuthor.create({ data: { paperId, authorId: author.id, position } })
  }
}

export async function ensureExtractionPlaceholder(paperId: number) {
  const existing = await db.paperExtraction.findUnique({ where: { paperId } })
  if (existing) return
  await db.paperExtraction.create({
    data: { paperId, extractedData: {}, needsReview: true },
  })
}

type KeyColumn = "zoteroKeyProduction" | "zoteroKeyStaging"

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

// Zotero child notes carry the coders' free-text annotations (e.g. "no open
// data despite claiming it"). One paginated call for every note in the
// library (135 at last count — cheap), grouped by the parent item's key.
async function fetchNotesByParent(
  libType: string,
  libId: string,
  apiKey: string
): Promise<Map<string, string[]>> {
  const notes = await zoteroGetAll(`/${libType}s/${libId}/items`, apiKey, {
    format: "json",
    itemType: "note",
  })
  const byParent = new Map<string, string[]>()
  for (const note of notes) {
    const parentKey = note.data.parentItem as string | undefined
    const text = stripHtml((note.data.note as string | undefined) ?? "")
    if (!parentKey || !text) continue
    const existing = byParent.get(parentKey) ?? []
    existing.push(text)
    byParent.set(parentKey, existing)
  }
  return byParent
}

// Upserts one Zotero item into Paper. resolveStatus(existingId) decides the
// status to set — return undefined to leave an existing row's status alone.
async function upsertPaperFromZoteroItem(
  item: ZoteroItem,
  keyColumn: KeyColumn,
  versionColumn: "zoteroVersionProduction" | "zoteroVersionStaging",
  resolveStatus: (existingId: number | null) => string | undefined,
  notes: string[] = []
): Promise<number | null> {
  const data = item.data ?? {}
  const itemType = data.itemType as string | undefined

  if (itemType === "attachment" || itemType === "note") return null

  const zoteroKey = item.key
  const zoteroVersion = item.version
  const doi: string | null = data.DOI || null
  const title: string = data.title || "(untitled)"
  const openalexId = extractOpenAlexId(data.extra)
  const relations = data.relations ?? null
  const manualTags = extractManualTags(data.tags)
  const detectedStage = detectStage(manualTags)

  let existing: Awaited<ReturnType<typeof db.paper.findFirst>> = null
  const byKey = await db.paper.findFirst({ where: { [keyColumn]: zoteroKey } })
  if (byKey) {
    existing = byKey
  } else if (doi) {
    existing = await db.paper.findFirst({ where: { doi } })
  } else if (openalexId) {
    existing = await db.paper.findFirst({ where: { openalexId } })
  }
  const existingId = existing?.id ?? null

  const status = resolveStatus(existingId)

  // Bibliographic content fields only fill in when the existing record is
  // still blank there — this pull shouldn't overwrite an admin's later
  // OpenAlex/Crossref enrichment (or manual edit) just because Zotero's own
  // copy of that field happens to be empty or stale.
  const fields: Record<string, any> = {
    title: existing?.title ?? title,
    doi: existing?.doi ?? doi,
    abstract: existing?.abstract ?? (data.abstractNote || null),
    year: existing?.year ?? extractYear(data.date),
    venue: existing?.venue ?? (data.publicationTitle || null),
    url: existing?.url ?? (data.url || null),
    itemType: existing?.itemType ?? (itemType ?? null),
    openalexId: existing?.openalexId ?? openalexId,
    zoteroRelations: relations ?? undefined,
    zoteroNotes: notes.length > 0 ? notes.join("\n\n---\n\n") : null,
    // Adds any tags newly applied in Zotero without dropping ones already on
    // the record — never destructive, even if a tag gets removed in Zotero.
    tags: [...new Set([...(existing?.tags ?? []), ...manualTags])],
    [keyColumn]: zoteroKey,
    [versionColumn]: zoteroVersion,
    ...(status !== undefined && { status }),
    // Never clobber a stage a human already set (via the paper edit form) if
    // this pull's tags don't confidently indicate one.
    ...(detectedStage !== null && { stage: detectedStage }),
  }

  const paper = existingId
    ? await db.paper.update({ where: { id: existingId }, data: fields })
    : await db.paper.create({ data: fields as Prisma.PaperCreateInput })

  await upsertAuthors(paper.id, extractAuthorNames(data.creators))

  return paper.id
}

// Zotero "Related" URLs look like http://zotero.org/groups/{id}/items/{KEY}.
function extractRelatedZoteroKeys(relations: unknown): string[] {
  if (!relations || typeof relations !== "object") return []
  const raw = (relations as Record<string, unknown>)["dc:relation"]
  const values: unknown[] = Array.isArray(raw) ? raw : raw ? [raw] : []
  return values
    .map((url) => String(url).match(/\/items\/(\w+)$/)?.[1])
    .filter((k): k is string => Boolean(k))
}

function roleForStage(stage: string | null): "STAGE1_ARTICLE" | "STAGE2_ARTICLE" | "OTHER" {
  if (stage === "STAGE_1") return "STAGE1_ARTICLE"
  if (stage === "STAGE_2") return "STAGE2_ARTICLE"
  return "OTHER"
}

// Zotero's "Related" links are the coders' own record of which Stage 1/Stage
// 2 (etc.) papers belong together — this turns those into Study/StudyPaper
// rows instead of leaving them sitting unused in Paper.zoteroRelations.
// Conservative on purpose: never merges two papers that are already each in
// a (different) Study — that's flagged as a conflict for a human to sort out
// rather than guessed at.
export async function linkRelatedStudies(): Promise<{
  linked: number
  alreadyLinked: number
  conflicts: number
}> {
  const papers = await db.paper.findMany({
    where: { zoteroKeyProduction: { not: null }, zoteroRelations: { not: Prisma.JsonNull } },
    select: { id: true, zoteroKeyProduction: true, zoteroRelations: true, stage: true },
  })
  const paperByZoteroKey = new Map(papers.map((p) => [p.zoteroKeyProduction as string, p]))

  const existingLinks = await db.studyPaper.findMany({ select: { paperId: true, studyId: true } })
  const studyIdByPaperId = new Map(existingLinks.map((l) => [l.paperId, l.studyId]))

  let linked = 0
  let alreadyLinked = 0
  let conflicts = 0
  const processedPairs = new Set<string>()

  for (const paper of papers) {
    for (const key of extractRelatedZoteroKeys(paper.zoteroRelations)) {
      const other = paperByZoteroKey.get(key)
      if (!other || other.id === paper.id) continue

      const pairKey = [paper.id, other.id].sort((a, b) => a - b).join(":")
      if (processedPairs.has(pairKey)) continue
      processedPairs.add(pairKey)

      const studyIdA = studyIdByPaperId.get(paper.id)
      const studyIdB = studyIdByPaperId.get(other.id)

      if (studyIdA && studyIdB) {
        if (studyIdA === studyIdB) alreadyLinked++
        else conflicts++
        continue
      }

      if (studyIdA || studyIdB) {
        const studyId = (studyIdA ?? studyIdB)!
        const unlinkedPaper = studyIdA ? other : paper
        await db.studyPaper.create({
          data: { studyId, paperId: unlinkedPaper.id, role: roleForStage(unlinkedPaper.stage) },
        })
        studyIdByPaperId.set(unlinkedPaper.id, studyId)
        linked++
        continue
      }

      const study = await db.study.create({ data: {} })
      await db.studyPaper.create({
        data: { studyId: study.id, paperId: paper.id, role: roleForStage(paper.stage) },
      })
      await db.studyPaper.create({
        data: { studyId: study.id, paperId: other.id, role: roleForStage(other.stage) },
      })
      studyIdByPaperId.set(paper.id, study.id)
      studyIdByPaperId.set(other.id, study.id)
      linked += 2
    }
  }

  return { linked, alreadyLinked, conflicts }
}

export async function importProductionLibrary(): Promise<{
  imported: number
  skipped: number
  studyLinks: { linked: number; alreadyLinked: number; conflicts: number }
}> {
  const apiKey = process.env.ZOTERO_API_KEY!
  const libType = process.env.ZOTERO_LIBRARY_TYPE!
  const libId = process.env.ZOTERO_LIBRARY_ID!

  // /items/top excludes child attachments/notes, which /items counts as
  // separate entries (each PDF, snapshot, note) — using /items would pull
  // ~3x more "items" than actual bibliographic records. Notes are fetched
  // separately below and matched back onto their parent.
  const items = await zoteroGetAll(`/${libType}s/${libId}/items/top`, apiKey, { format: "json" })
  const notesByParent = await fetchNotesByParent(libType, libId, apiKey)

  let imported = 0
  let skipped = 0
  for (const item of items) {
    const paperId = await upsertPaperFromZoteroItem(
      item,
      "zoteroKeyProduction",
      "zoteroVersionProduction",
      () => "IMPORTED",
      notesByParent.get(item.key) ?? []
    )
    if (paperId === null) {
      skipped++
    } else {
      imported++
      await ensureExtractionPlaceholder(paperId)
    }
  }

  const studyLinks = await linkRelatedStudies()

  return { imported, skipped, studyLinks }
}

const COLLECTION_NUMBER_RE = /^\s*(\d+)\b/
const NUMBER_STATUS: Record<number, string> = {
  1: "PENDING_REVIEW", // To Check
  2: "IMPORTED", // To Tag
  4: "REJECTED", // Do Not Add
}
// 3 (To Push) is empty and 5 (Duplicate) is ignored for now — intentionally absent.

async function collectItemsRecursive(
  libType: string,
  libId: string,
  apiKey: string,
  collectionKey: string,
  seen: Set<string> = new Set()
): Promise<ZoteroItem[]> {
  const prefix = `/${libType}s/${libId}`
  const items = await zoteroGetAll(`${prefix}/collections/${collectionKey}/items/top`, apiKey, {
    format: "json",
  })
  const subcollections = await zoteroGetAll(
    `${prefix}/collections/${collectionKey}/collections`,
    apiKey,
    { format: "json" }
  )
  for (const sub of subcollections as any[]) {
    const subKey = sub.key as string
    if (seen.has(subKey)) continue
    seen.add(subKey)
    items.push(...(await collectItemsRecursive(libType, libId, apiKey, subKey, seen)))
  }
  return items
}

export async function importStagingCollections(): Promise<Record<string, number>> {
  const apiKey = process.env.ZOTERO_STAGING_API_KEY!
  const libType = process.env.ZOTERO_STAGING_LIBRARY_TYPE!
  const libId = process.env.ZOTERO_STAGING_LIBRARY_ID!

  const topCollections = await zoteroGetAll(`/${libType}s/${libId}/collections/top`, apiKey, {
    format: "json",
  })

  const keyAndNameByNumber = new Map<number, { key: string; name: string }>()
  for (const c of topCollections as any[]) {
    const name = c.data.name as string
    const match = name.match(COLLECTION_NUMBER_RE)
    if (match) keyAndNameByNumber.set(Number(match[1]), { key: c.key, name })
  }

  const totals: Record<string, number> = {}

  for (const [number, status] of Object.entries(NUMBER_STATUS)) {
    const found = keyAndNameByNumber.get(Number(number))
    if (!found) continue

    const items = await collectItemsRecursive(libType, libId, apiKey, found.key)

    let count = 0
    for (const item of items) {
      const paperId = await upsertPaperFromZoteroItem(
        item,
        "zoteroKeyStaging",
        "zoteroVersionStaging",
        () => status
      )
      if (paperId !== null) {
        count++
        if (status === "IMPORTED") await ensureExtractionPlaceholder(paperId)
      }
    }
    totals[found.name] = count
  }

  return totals
}
