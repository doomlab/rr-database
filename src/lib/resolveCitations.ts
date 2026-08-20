import db from "db"
import { fetchCitingWorks } from "./fetchCitingWorks"
import type { CitationEntry } from "src/app/components/CitationCard"

const CONFIRMED_STATUSES: ("IMPORTED" | "APPROVED")[] = ["IMPORTED", "APPROVED"]

export async function resolveCitations(paper: {
  id: number
  openalexId: string | null
  citedByCount: number | null
  citationsFrom: {
    citedOpenAlexId: string
    title: string | null
    year: number | null
    journal: string | null
    doi: string | null
  }[]
}) {
  const citedByResult = paper.openalexId
    ? await fetchCitingWorks(paper.openalexId)
    : { works: [], total: null }

  const allOpenAlexIds = [
    ...paper.citationsFrom.map((c) => c.citedOpenAlexId),
    ...citedByResult.works.map((w) => w.openalexId),
  ]

  const matchedCitations =
    allOpenAlexIds.length > 0
      ? await db.paper.findMany({
          where: { openalexId: { in: allOpenAlexIds }, status: { in: CONFIRMED_STATUSES } },
          select: {
            id: true,
            openalexId: true,
            studyPaper: { select: { studyId: true } },
            canonical: { select: { id: true, studyPaper: { select: { studyId: true } } } },
          },
        })
      : []

  const matchedById = new Map<string, { id: number; studyId: number }>()
  for (const p of matchedCitations) {
    const resolved = p.canonical ?? p
    const studyId = resolved.studyPaper?.studyId
    if (p.openalexId && studyId != null) {
      matchedById.set(p.openalexId, { id: resolved.id, studyId })
    }
  }

  const references: CitationEntry[] = paper.citationsFrom.map((c) => ({
    title: c.title,
    year: c.year,
    journal: c.journal,
    doi: c.doi,
    openalexId: c.citedOpenAlexId,
    match: matchedById.get(c.citedOpenAlexId),
  }))

  const citedBy: CitationEntry[] = citedByResult.works.map((w) => ({
    title: w.title,
    year: w.year,
    journal: w.journal,
    doi: w.doi,
    openalexId: w.openalexId,
    match: matchedById.get(w.openalexId),
  }))

  return {
    references,
    referencesInDbCount: references.filter((r) => r.match).length,
    citedBy,
    citedByInDbCount: citedBy.filter((c) => c.match).length,
    citedByTotal: citedByResult.total ?? paper.citedByCount,
  }
}
