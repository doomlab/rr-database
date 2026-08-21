import db, { Prisma, PaperStatus, StudyPaperRole } from "db"

export const CONFIRMED_STATUSES: PaperStatus[] = [PaperStatus.IMPORTED, PaperStatus.APPROVED]
const STAGE1_ROLES: StudyPaperRole[] = [StudyPaperRole.STAGE1_ARTICLE, StudyPaperRole.STAGE1_MATERIALS]
const STAGE2_ROLES: StudyPaperRole[] = [StudyPaperRole.STAGE2_ARTICLE]

export type StudyFilterSearchParams = {
  q?: string
  keyword?: string
  stage?: string
  openAccess?: string
  venue?: string
  yearFrom?: string
  yearTo?: string
}

export function parseStudyFilterParams(params: StudyFilterSearchParams) {
  const q = params.q?.trim() || undefined
  const keyword = params.keyword?.trim().toLowerCase() || undefined
  const keywords = keyword
    ? keyword
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
    : []
  const venue = params.venue?.trim() || undefined
  const venues = venue
    ? venue
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : []
  const stage = params.stage === "1" || params.stage === "2" || params.stage === "both" ? params.stage : undefined
  const openAccess = params.openAccess === "yes" || params.openAccess === "no" ? params.openAccess : undefined
  const yearFrom = params.yearFrom?.trim() || undefined
  const yearTo = params.yearTo?.trim() || undefined

  return { q, keyword, keywords, venue, venues, stage, openAccess, yearFrom, yearTo }
}

export type ParsedStudyFilters = ReturnType<typeof parseStudyFilterParams>

export async function buildStudyWhere(filters: ParsedStudyFilters) {
  const { q, keywords, venues, stage, openAccess, yearFrom, yearTo } = filters

  // Prisma's array filters only support exact-element matching, so a substring
  // match on keywords needs a raw pre-pass to resolve which papers qualify.
  const keywordMatchedPaperIds =
    keywords.length > 0
      ? (
          await db.$queryRaw<{ id: number }[]>(Prisma.sql`
            SELECT DISTINCT p.id
            FROM "Paper" p, unnest(p.keywords) AS kw
            WHERE p.status::text IN (${PaperStatus.IMPORTED}, ${PaperStatus.APPROVED})
              AND (${Prisma.join(
                keywords.map((k) => Prisma.sql`kw ILIKE ${"%" + k + "%"}`),
                " OR "
              )})
          `)
        ).map((r) => r.id)
      : []

  const andConditions = [
    ...(q
      ? [
          {
            papers: {
              some: {
                paper: {
                  status: { in: CONFIRMED_STATUSES },
                  OR: [
                    { title: { contains: q, mode: "insensitive" as const } },
                    { abstract: { contains: q, mode: "insensitive" as const } },
                    { doi: { contains: q, mode: "insensitive" as const } },
                    {
                      authors: {
                        some: { author: { name: { contains: q, mode: "insensitive" as const } } },
                      },
                    },
                  ],
                },
              },
            },
          },
        ]
      : []),
    ...(keywords.length > 0
      ? [
          {
            papers: {
              some: {
                paper: { status: { in: CONFIRMED_STATUSES }, id: { in: keywordMatchedPaperIds } },
              },
            },
          },
        ]
      : []),
    ...(venues.length > 0
      ? [
          {
            papers: {
              some: {
                paper: {
                  status: { in: CONFIRMED_STATUSES },
                  OR: venues.map((v) => ({ venue: { contains: v, mode: "insensitive" as const } })),
                },
              },
            },
          },
        ]
      : []),
    ...(openAccess
      ? [
          {
            papers: {
              some: {
                paper: { status: { in: CONFIRMED_STATUSES }, openAccess: openAccess === "yes" },
              },
            },
          },
        ]
      : []),
    ...(yearFrom || yearTo
      ? [
          {
            papers: {
              some: {
                paper: {
                  status: { in: CONFIRMED_STATUSES },
                  year: {
                    ...(yearFrom ? { gte: Number(yearFrom) } : {}),
                    ...(yearTo ? { lte: Number(yearTo) } : {}),
                  },
                },
              },
            },
          },
        ]
      : []),
    ...(stage === "1"
      ? [
          { papers: { some: { role: { in: STAGE1_ROLES } } } },
          { papers: { none: { role: { in: STAGE2_ROLES } } } },
        ]
      : []),
    ...(stage === "2"
      ? [
          { papers: { some: { role: { in: STAGE2_ROLES } } } },
          { papers: { none: { role: { in: STAGE1_ROLES } } } },
        ]
      : []),
    ...(stage === "both"
      ? [
          { papers: { some: { role: { in: STAGE1_ROLES } } } },
          { papers: { some: { role: { in: STAGE2_ROLES } } } },
        ]
      : []),
  ]

  return {
    papers: { some: { paper: { status: { in: CONFIRMED_STATUSES } } } },
    ...(andConditions.length > 0 ? { AND: andConditions } : {}),
  }
}
