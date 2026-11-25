import type { Prisma } from "db"

// Confirmed items that still have a source to pull: OpenAlex never fetched, or
// a DOI that Crossref was never asked about. Shared by the Enrich page, the
// admin menu badge and the admin home card so the numbers agree.
export const NEEDS_ENRICH_WHERE: Prisma.PaperWhereInput = {
  canonicalPaperId: null,
  status: { in: ["IMPORTED", "APPROVED"] },
  OR: [{ openAlexFetchedAt: null }, { doi: { not: null }, crossrefQueried: false }],
}
