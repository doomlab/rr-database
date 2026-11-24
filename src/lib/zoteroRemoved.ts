import db from "db"
import { zoteroGetAll } from "./zoteroImport"

// The production pull only ever adds and updates: it never removes anything
// that has since been deleted from Zotero. So if items were pulled in by
// mistake and then removed from Zotero, they linger on the site. This lists
// the ones still here: papers that came from the production library (they
// carry a Zotero key) whose key is no longer in the library. Items that are
// already excluded or marked duplicate are left alone.
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

  const papers = await db.paper.findMany({
    where: {
      zoteroKeyProduction: { not: null },
      status: { notIn: ["REJECTED", "DUPLICATE"] },
    },
    select: { id: true, title: true, year: true, status: true, zoteroKeyProduction: true },
    orderBy: { id: "asc" },
  })
  return {
    zoteroCount: liveKeys.size,
    removed: papers.filter((p) => !liveKeys.has(p.zoteroKeyProduction as string)),
  }
}
