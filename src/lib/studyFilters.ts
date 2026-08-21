import db, { Prisma, PaperStatus, StudyPaperRole } from "db"
import { OA_STATUS_OPTIONS } from "src/lib/openAccessStatus"

export const CONFIRMED_STATUSES: PaperStatus[] = [PaperStatus.IMPORTED, PaperStatus.APPROVED]
export const STAGE1_ROLES: StudyPaperRole[] = [StudyPaperRole.STAGE1_ARTICLE, StudyPaperRole.STAGE1_MATERIALS]
export const STAGE2_ROLES: StudyPaperRole[] = [StudyPaperRole.STAGE2_ARTICLE, StudyPaperRole.STAGE2_MATERIALS]
export const MATERIALS_ROLES: StudyPaperRole[] = [
  StudyPaperRole.STAGE1_MATERIALS,
  StudyPaperRole.STAGE2_MATERIALS,
]
const OA_STATUS_VALUES = OA_STATUS_OPTIONS.map((o) => o.value)

export type StudyFilterSearchParams = {
  q?: string
  keyword?: string
  stage?: string
  materials?: string
  verified?: string
  oaStatus?: string
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
  const materials = params.materials === "yes" ? "yes" : undefined
  const verified = params.verified === "yes" ? "yes" : undefined
  const oaStatusRaw = params.oaStatus?.trim().toLowerCase() || undefined
  const oaStatus = oaStatusRaw && OA_STATUS_VALUES.includes(oaStatusRaw) ? oaStatusRaw : undefined
  const yearFrom = params.yearFrom?.trim() || undefined
  const yearTo = params.yearTo?.trim() || undefined

  return { q, keyword, keywords, venue, venues, stage, materials, verified, oaStatus, yearFrom, yearTo }
}

export type ParsedStudyFilters = ReturnType<typeof parseStudyFilterParams>

// Turns a stored `?q=...&stage=1` query string back into filter params —
// used when re-running a saved search server-side.
export function parseStudyFilterQueryString(query: string) {
  const sp = new URLSearchParams(query)
  return parseStudyFilterParams({
    q: sp.get("q") ?? undefined,
    keyword: sp.get("keyword") ?? undefined,
    stage: sp.get("stage") ?? undefined,
    materials: sp.get("materials") ?? undefined,
    verified: sp.get("verified") ?? undefined,
    oaStatus: sp.get("oaStatus") ?? undefined,
    venue: sp.get("venue") ?? undefined,
    yearFrom: sp.get("yearFrom") ?? undefined,
    yearTo: sp.get("yearTo") ?? undefined,
  })
}

const STAGE_LABELS: Record<string, string> = { "1": "Stage 1", "2": "Stage 2", both: "Stage 1 + 2" }
const OA_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  OA_STATUS_OPTIONS.map((o) => [o.value, o.label])
)

// Human-readable chips summarizing a saved search's criteria for display.
export function describeStudyFilters(filters: ParsedStudyFilters): string[] {
  const chips: string[] = []
  if (filters.q) chips.push(`"${filters.q}"`)
  if (filters.stage) chips.push(STAGE_LABELS[filters.stage] ?? filters.stage)
  if (filters.materials) chips.push("Materials")
  if (filters.verified) chips.push("Verified metadata")
  if (filters.oaStatus) chips.push(OA_STATUS_LABELS[filters.oaStatus] ?? filters.oaStatus)
  if (filters.yearFrom || filters.yearTo) chips.push(`${filters.yearFrom ?? "…"}–${filters.yearTo ?? "…"}`)
  filters.keywords.forEach((k) => chips.push(k))
  filters.venues.forEach((v) => chips.push(v))
  return chips
}

export async function buildStudyWhere(filters: ParsedStudyFilters) {
  const { q, keywords, venues, stage, materials, verified, oaStatus, yearFrom, yearTo } = filters

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

  // Search across every text field on the paper (and its authors/tags/keywords),
  // not just title/abstract/doi — a raw pre-pass since array-field substring
  // matches (tags, keywords) aren't expressible through Prisma's filter API.
  const qMatchedPaperIds = q
    ? (
        await db.$queryRaw<{ id: number }[]>(Prisma.sql`
          SELECT DISTINCT p.id
          FROM "Paper" p
          LEFT JOIN "PaperAuthor" pa ON pa."paperId" = p.id
          LEFT JOIN "Author" a ON a.id = pa."authorId"
          WHERE p.status::text IN (${PaperStatus.IMPORTED}, ${PaperStatus.APPROVED})
            AND (
              p.title ILIKE ${"%" + q + "%"}
              OR p.abstract ILIKE ${"%" + q + "%"}
              OR p.doi ILIKE ${"%" + q + "%"}
              OR p.venue ILIKE ${"%" + q + "%"}
              OR p.publisher ILIKE ${"%" + q + "%"}
              OR p.issn ILIKE ${"%" + q + "%"}
              OR p.language ILIKE ${"%" + q + "%"}
              OR p."itemType" ILIKE ${"%" + q + "%"}
              OR p."registrationUrl" ILIKE ${"%" + q + "%"}
              OR p."registrationPlatform" ILIKE ${"%" + q + "%"}
              OR p."biasLevel" ILIKE ${"%" + q + "%"}
              OR a.name ILIKE ${"%" + q + "%"}
              OR EXISTS (SELECT 1 FROM unnest(p.tags) t WHERE t ILIKE ${"%" + q + "%"})
              OR EXISTS (SELECT 1 FROM unnest(p.keywords) kw WHERE kw ILIKE ${"%" + q + "%"})
            )
        `)
      ).map((r) => r.id)
    : []

  const andConditions = [
    ...(q
      ? [
          {
            papers: {
              some: {
                paper: { status: { in: CONFIRMED_STATUSES }, id: { in: qMatchedPaperIds } },
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
    ...(oaStatus
      ? [
          {
            papers: {
              some: {
                paper: {
                  status: { in: CONFIRMED_STATUSES },
                  openAccessStatus: { equals: oaStatus, mode: "insensitive" as const },
                },
              },
            },
          },
        ]
      : []),
    ...(materials
      ? [{ papers: { some: { role: { in: MATERIALS_ROLES } } } }]
      : []),
    ...(verified
      ? [
          {
            papers: {
              some: {
                paper: { status: { in: CONFIRMED_STATUSES }, metadataVerifiedAt: { not: null } },
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
