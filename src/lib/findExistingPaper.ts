import db from "db"
import { normalizeDoi } from "./crossrefPaperLookup"
import { findMatchingPaper } from "./duplicateClusters"

export type ExistingMatch = {
  id: number
  title: string
  status: string
  studyId: number | null
  // "doi" and "url" are exact matches; "title" is a fuzzy title match.
  matchedOn: "doi" | "url" | "title"
}

// Looks for a paper already in the database that a suggestion (or anything
// else with a DOI, link and/or title) would duplicate. Checks DOI, then link,
// then fuzzy title — first hit wins.
export async function findExistingPaper(input: {
  doi?: string | null
  url?: string | null
  title?: string | null
}): Promise<ExistingMatch | null> {
  const select = { id: true, title: true, status: true, studyPaper: { select: { studyId: true } } } as const
  const shape = (p: { id: number; title: string; status: string; studyPaper: { studyId: number } | null }, matchedOn: ExistingMatch["matchedOn"]): ExistingMatch => ({
    id: p.id,
    title: p.title,
    status: p.status,
    studyId: p.studyPaper?.studyId ?? null,
    matchedOn,
  })

  const doi = input.doi?.trim() ? normalizeDoi(input.doi) : null
  if (doi) {
    const p = await db.paper.findFirst({ where: { doi: { equals: doi, mode: "insensitive" } }, select })
    if (p) return shape(p, "doi")
  }

  const url = input.url?.trim()
  if (url) {
    const p = await db.paper.findFirst({ where: { url }, select })
    if (p) return shape(p, "url")
  }

  const title = input.title?.trim()
  if (title) {
    const m = await findMatchingPaper(title)
    if (m) {
      const p = await db.paper.findUnique({ where: { id: m.id }, select })
      if (p) return shape(p, "title")
    }
  }
  return null
}
