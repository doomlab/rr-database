import { Navbar } from "./components/Navbar"
import { FavoriteButton } from "./components/FavoriteButton"
import { ReportButton } from "./components/ReportButton"
import { Pagination } from "./components/Pagination"
import { SearchAndKeywordFilter } from "./components/SearchAndKeywordFilter"
import { SavedSearchBar } from "./components/SavedSearchBar"
import { getBlitzContext } from "./blitz-server"
import db from "db"
import {
  parseStudyFilterParams,
  buildStudyWhere,
  CONFIRMED_STATUSES,
  STAGE1_ROLES,
  STAGE2_ROLES,
  MATERIALS_ROLES,
} from "src/lib/studyFilters"
import { OA_STATUS_OPTIONS } from "src/lib/openAccessStatus"

const OA_STATUS_BADGE_LABELS: Record<string, string> = Object.fromEntries(
  OA_STATUS_OPTIONS.map((o) => [o.value, o.label])
)

const PAGE_SIZE = 50

function primaryPaper(papers: { role: string; paper: any }[]) {
  return (
    papers.find((p) => p.role === "STAGE2_ARTICLE")?.paper ??
    papers.find((p) => p.role === "STAGE1_ARTICLE")?.paper ??
    papers[0]?.paper
  )
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    keyword?: string
    stage?: string
    materials?: string
    verified?: string
    oaStatus?: string
    practices?: string
    venue?: string
    yearFrom?: string
    yearTo?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const filters = parseStudyFilterParams(params)
  const { q, keyword, venue, stage, materials, verified, oaStatus, practices, yearFrom, yearTo } = filters
  const practicesParam = practices.length > 0 ? practices.join(",") : undefined
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const ctx = await getBlitzContext()
  const userId = ctx.session.userId as number | undefined

  const studyWhere = await buildStudyWhere(filters)

  const [studies, totalStudies, favoritedIds, reportedIds, savedSearches] = await Promise.all([
    db.study.findMany({
      where: studyWhere,
      include: {
        papers: {
          where: { paper: { status: { in: CONFIRMED_STATUSES } } },
          include: {
            paper: {
              include: { authors: { include: { author: true }, orderBy: { position: "asc" } } },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    db.study.count({ where: studyWhere }),
    userId
      ? db.studyFavorite
          .findMany({ where: { userId }, select: { studyId: true } })
          .then((rows) => new Set(rows.map((r) => r.studyId)))
      : Promise.resolve(new Set<number>()),
    userId
      ? db.paperReport
          .findMany({ where: { userId }, select: { paperId: true } })
          .then((rows) => new Set(rows.map((r) => r.paperId)))
      : Promise.resolve(new Set<number>()),
    userId
      ? db.savedSearch.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, query: true },
        })
      : Promise.resolve([]),
  ])

  const totalPages = Math.ceil(totalStudies / PAGE_SIZE)

  const filtersQueryString = (() => {
    const sp = new URLSearchParams()
    if (q) sp.set("q", q)
    if (keyword) sp.set("keyword", keyword)
    if (venue) sp.set("venue", venue)
    if (stage) sp.set("stage", stage)
    if (materials) sp.set("materials", materials)
    if (verified) sp.set("verified", verified)
    if (oaStatus) sp.set("oaStatus", oaStatus)
    if (practicesParam) sp.set("practices", practicesParam)
    if (yearFrom) sp.set("yearFrom", yearFrom)
    if (yearTo) sp.set("yearTo", yearTo)
    return sp.toString()
  })()

  const buildHref = (p: number) => {
    const sp = new URLSearchParams(filtersQueryString)
    sp.set("page", String(p))
    return `/?${sp.toString()}`
  }

  const exportHref = filtersQueryString
    ? `/api/export/studies?${filtersQueryString}`
    : "/api/export/studies"

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <Navbar />

      <div className="flex-1 w-full px-10 py-8">
        <div className="w-[90%] mx-auto">
          <SearchAndKeywordFilter
            action="/"
            q={q}
            keyword={keyword}
            stage={stage}
            materials={materials}
            verified={verified}
            showStageFilter
            showAdvancedFilters
            oaStatus={oaStatus}
            practices={practicesParam}
            venue={venue}
            yearFrom={yearFrom}
            yearTo={yearTo}
          />

          <div className="flex items-center justify-between mb-5">
            <p className="text-base text-base-content/60">
              <span className="font-semibold text-base-content">{totalStudies}</span> registered
              report{totalStudies === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-2">
              {userId && (
                <SavedSearchBar currentQuery={filtersQueryString} savedSearches={savedSearches} />
              )}
              <a href={exportHref} className="btn btn-primary btn-sm">
                Download results (CSV)
              </a>
              <a
                href={userId ? "/suggest-article" : "/login?next=/suggest-article"}
                className="btn btn-warning btn-sm"
              >
                Can't find a paper? Suggest one
              </a>
            </div>
          </div>

          {studies.length === 0 ? (
            <div className="text-center py-16 text-base-content/40">
              <p className="text-lg">No results match your search.</p>
              <a href="/" className="link link-primary text-sm mt-2 inline-block">
                Clear search
              </a>
            </div>
          ) : (
            <>
              <ul className="flex flex-col divide-y divide-base-200">
                {studies.map((study) => {
                  const paper = primaryPaper(study.papers)
                  if (!paper) return null
                  const hasStage1 = study.papers.some((p) => (STAGE1_ROLES as string[]).includes(p.role))
                  const hasStage2 = study.papers.some((p) => (STAGE2_ROLES as string[]).includes(p.role))
                  const hasMaterials = study.papers.some((p) => (MATERIALS_ROLES as string[]).includes(p.role))
                  const hasBothStages = hasStage1 && hasStage2
                  const stageBadge = hasBothStages
                    ? { label: "stage 1 + 2", color: "badge-primary" }
                    : hasStage1
                      ? { label: "stage 1", color: "badge-info" }
                      : hasStage2
                        ? { label: "stage 2", color: "badge-accent" }
                        : null
                  const oaStatusLabel = paper.openAccessStatus
                    ? OA_STATUS_BADGE_LABELS[paper.openAccessStatus.toLowerCase()] ?? paper.openAccessStatus
                    : null
                  const isVerified = !!paper.metadataVerifiedAt
                  const hasOpenData = study.papers.some((p) => !!p.paper.openDataUrl)
                  const hasOpenCode = study.papers.some((p) => !!p.paper.openCodeUrl)
                  const hasOpenMaterials = study.papers.some((p) => !!p.paper.openMaterialsUrl)
                  const hasPrereg = study.papers.some((p) => !!p.paper.registrationUrl)
                  return (
                    <li
                      key={study.id}
                      className="py-5 hover:bg-base-200/40 px-3 -mx-3 rounded-lg transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h2 className="font-semibold text-base leading-snug">{paper.title}</h2>
                            {stageBadge && (
                              <span className={`badge ${stageBadge.color} badge-sm shrink-0`}>
                                {stageBadge.label}
                              </span>
                            )}
                            {hasMaterials && (
                              <span className="badge badge-neutral badge-sm shrink-0">materials</span>
                            )}
                            {oaStatusLabel && (
                              <span className="badge badge-success badge-sm shrink-0">{oaStatusLabel}</span>
                            )}
                            {isVerified && (
                              <span className="badge badge-secondary badge-sm shrink-0">verified</span>
                            )}
                          </div>
                          {(hasOpenData || hasOpenCode || hasOpenMaterials || hasPrereg) && (
                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                              {hasPrereg && (
                                <span className="badge badge-outline badge-secondary badge-sm">
                                  preregistered
                                </span>
                              )}
                              {hasOpenData && (
                                <span className="badge badge-outline badge-success badge-sm">open data</span>
                              )}
                              {hasOpenCode && (
                                <span className="badge badge-outline badge-accent badge-sm">open code</span>
                              )}
                              {hasOpenMaterials && (
                                <span className="badge badge-outline badge-success badge-sm">
                                  open materials
                                </span>
                              )}
                            </div>
                          )}
                          {paper.abstract && (
                            <p className="text-base text-base-content/60 mb-2 line-clamp-2">
                              {paper.abstract}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/50">
                            {paper.authors.length > 0 && (
                              <>
                                <span>
                                  {paper.authors.map((pa: any) => pa.author.name).join(", ")}
                                </span>
                                <span>·</span>
                              </>
                            )}
                            {paper.year && <span>{paper.year}</span>}
                            {paper.venue && (
                              <>
                                <span>·</span>
                                <span className="italic">{paper.venue}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <ReportButton
                            paperId={paper.id}
                            initialReported={reportedIds.has(paper.id)}
                            isLoggedIn={!!userId}
                          />
                          <FavoriteButton
                            studyId={study.id}
                            initialFavorited={favoritedIds.has(study.id)}
                            isLoggedIn={!!userId}
                          />
                          <a href={`/studies/${study.id}`} className="btn btn-primary btn-sm">
                            View
                          </a>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
