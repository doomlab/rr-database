import db from "db"
import { zoteroGetAll } from "./zoteroImport"
import { normalizeTitle } from "./duplicateClusters"
import { cleanTitle } from "./cleanText"

// The production pull only ever adds and updates: it never removes anything
// that has since been deleted from Zotero. So if items were pulled in by
// mistake and then removed from Zotero, they linger on the site. This lists
// the ones still here: papers that came from the production library (they
// carry a Zotero key) whose key is no longer in the library.
//
// A key changing doesn't mean the item left: deleting and re-adding an item,
// or moving it between libraries, gives it a new key. So an item whose DOI or
// exact title is still in the library is counted as "rekeyed", not removed,
// and the next pull simply reattaches it. Only items nothing in the library
// matches are returned as removed. Items already excluded or marked duplicate
// are left alone.
export async function findPapersRemovedFromZotero() {
  const apiKey = process.env.ZOTERO_API_KEY!
  const libType = process.env.ZOTERO_LIBRARY_TYPE!
  const libId = process.env.ZOTERO_LIBRARY_ID!

  const items = await zoteroGetAll(`/${libType}s/${libId}/items/top`, apiKey, { format: "json" })
  const liveKeys = new Set(items.map((i) => i.key))
  // A failed or empty fetch would make every paper look "removed".
  if (liveKeys.size < 100) {
    throw new Error(`Zotero returned only ${liveKeys.size} items, so nothing was changed.`)
  }
  const liveDois = new Set(
    items.map((i) => String(i.data?.DOI ?? "").trim().toLowerCase()).filter(Boolean)
  )
  const liveTitles = new Set(
    items.map((i) => normalizeTitle(cleanTitle(String(i.data?.title ?? "")))).filter(Boolean)
  )

  const papers = await db.paper.findMany({
    where: {
      zoteroKeyProduction: { not: null },
      status: { notIn: ["REJECTED", "DUPLICATE"] },
    },
    select: {
      id: true,
      title: true,
      doi: true,
      year: true,
      status: true,
      stage: true,
      metadataVerifiedAt: true,
      zoteroKeyProduction: true,
      studyPaper: { select: { study: { select: { _count: { select: { papers: true } } } } } },
    },
    orderBy: { id: "asc" },
  })

  const keyMissing = papers.filter((p) => !liveKeys.has(p.zoteroKeyProduction as string))
  const stillThere = (p: (typeof papers)[number]) =>
    (p.doi != null && liveDois.has(p.doi.trim().toLowerCase())) || liveTitles.has(normalizeTitle(p.title))
  const removed = keyMissing.filter((p) => !stillThere(p))

  // Signs that an item is a real registered report, or that someone has
  // already worked on it: worth a look before anything is excluded.
  const attention = removed
    .map((p) => {
      const reasons: string[] = []
      if (/registered report|preregistered|pre-registered|stage\s*[12]\b/i.test(p.title)) reasons.push("title says registered report")
      if (p.stage) reasons.push("has a stage")
      if (p.status === "APPROVED") reasons.push("approved here")
      if (p.metadataVerifiedAt) reasons.push("metadata verified")
      if ((p.studyPaper?.study._count.papers ?? 0) >= 2) reasons.push("linked into a study")
      return { paper: p, reasons }
    })
    .filter((a) => a.reasons.length > 0)

  return { zoteroCount: liveKeys.size, rekeyed: keyMissing.filter(stillThere).length, removed, attention }
}
