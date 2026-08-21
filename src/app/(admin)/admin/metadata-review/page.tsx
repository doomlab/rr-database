import db from "db"
import { Pagination } from "../../../components/Pagination"
import { SearchAndKeywordFilter } from "../../../components/SearchAndKeywordFilter"

const PAGE_SIZE = 50
const CONFIRMED_STATUSES = ["IMPORTED", "APPROVED"] as const

type WithStudyPaper = {
  id: number
  studyPaper: { studyId: number; study: { _count: { papers: number } } } | null
}

// Groups this page's results by Study so linked Stage 1/2 records show up
// together in one card, like the Link papers page does — only groups papers
// that are actually in a real multi-paper Study; anything solo (or whose
// counterpart isn't in this filtered/paginated result set) stays on its own.
function groupPapersByStudy<T extends WithStudyPaper>(papers: T[]): T[][] {
  const groups = new Map<string, T[]>()
  const order: string[] = []
  for (const paper of papers) {
    const isClustered = (paper.studyPaper?.study._count.papers ?? 0) >= 2
    const key = isClustered ? `study-${paper.studyPaper!.studyId}` : `paper-${paper.id}`
    const existing = groups.get(key)
    if (existing) {
      existing.push(paper)
    } else {
      groups.set(key, [paper])
      order.push(key)
    }
  }
  return order.map((key) => groups.get(key)!)
}

export default async function MetadataReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; tab?: string }>
}) {
  const params = await searchParams
  const q = params.q?.trim() || undefined
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const skip = (page - 1) * PAGE_SIZE
  const tab = params.tab === "done" ? "done" : "needs-review"

  const searchFilter = q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" as const } },
          { doi: { contains: q, mode: "insensitive" as const } },
          { authors: { some: { author: { name: { contains: q, mode: "insensitive" as const } } } } },
        ],
      }
    : {}

  const baseWhere = {
    canonicalPaperId: null,
    status: { in: [...CONFIRMED_STATUSES] },
  }

  const [needsReviewCount, doneCount] = await Promise.all([
    db.paper.count({ where: { ...baseWhere, metadataVerifiedAt: null } }),
    db.paper.count({ where: { ...baseWhere, metadataVerifiedAt: { not: null } } }),
  ])

  const where = {
    ...baseWhere,
    metadataVerifiedAt: tab === "done" ? { not: null } : null,
    ...searchFilter,
  }

  const [papers, totalPapers] = await Promise.all([
    db.paper.findMany({
      where,
      include: {
        authors: { include: { author: true }, orderBy: { position: "asc" } },
        metadataVerifiedBy: { select: { name: true, email: true } },
        studyPaper: {
          select: { studyId: true, study: { select: { _count: { select: { papers: true } } } } },
        },
      },
      orderBy: tab === "done" ? { metadataVerifiedAt: "desc" } : { updatedAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    db.paper.count({ where }),
  ])

  const totalPages = Math.ceil(totalPapers / PAGE_SIZE)
  const buildHref = (p: number) => {
    const sp = new URLSearchParams()
    if (q) sp.set("q", q)
    sp.set("tab", tab)
    sp.set("page", String(p))
    return `/admin/metadata-review?${sp.toString()}`
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Metadata review</h1>
      <p className="text-base text-base-content/60 mb-6">
        Confirm each paper's metadata is correct — tags, open science links, JMIR badge info, and
        anything else that's been added or edited. Open a paper and click "Mark metadata verified"
        once it looks right.
      </p>

      <SearchAndKeywordFilter action="/admin/metadata-review" q={q} />

      <div className="tabs tabs-boxed w-fit mb-6">
        <a
          href={`/admin/metadata-review?tab=needs-review${q ? `&q=${encodeURIComponent(q)}` : ""}`}
          className={`tab ${tab === "needs-review" ? "tab-active" : ""}`}
        >
          Needs review ({needsReviewCount})
        </a>
        <a
          href={`/admin/metadata-review?tab=done${q ? `&q=${encodeURIComponent(q)}` : ""}`}
          className={`tab ${tab === "done" ? "tab-active" : ""}`}
        >
          Done ({doneCount})
        </a>
      </div>

      {papers.length === 0 ? (
        <div className="text-center py-16 text-base-content/40">
          <p className="text-lg">
            {q
              ? "No results match your search."
              : tab === "done"
                ? "Nothing verified yet."
                : "Nothing left to review."}
          </p>
          {q && (
            <a href="/admin/metadata-review" className="link link-primary text-sm mt-2 inline-block">
              Clear search
            </a>
          )}
        </div>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-base-200">
            {groupPapersByStudy(papers).map((group) => {
              const first = group[0]!
              const isClustered = group.length > 1
              const viewHref = isClustered
                ? `/studies/${first.studyPaper!.studyId}`
                : `/papers/${first.id}`

              return (
                <li
                  key={isClustered ? `study-${first.studyPaper!.studyId}` : `paper-${first.id}`}
                  className="py-5 px-3 -mx-3 rounded-lg hover:bg-base-200/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {isClustered && (
                        <p className="text-xs font-semibold uppercase tracking-wider text-base-content/40 mb-2">
                          {group.length} linked records
                        </p>
                      )}
                      <div className="flex flex-col gap-3">
                        {group.map((paper) => (
                          <div key={paper.id}>
                            <h2 className="font-semibold text-base leading-snug mb-1">{paper.title}</h2>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/50">
                              {paper.authors.length > 0 && (
                                <>
                                  <span>{paper.authors.map((pa) => pa.author.name).join(", ")}</span>
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
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {paper.openSciencePracticesScannedAt && (
                                <span className="badge badge-sm badge-outline">PDF scanned</span>
                              )}
                              {paper.jmirBadgeCheckedAt && (
                                <span className="badge badge-sm badge-outline">JMIR badge checked</span>
                              )}
                              {tab === "done" && paper.metadataVerifiedAt && (
                                <span className="badge badge-sm badge-success badge-outline">
                                  Verified by{" "}
                                  {paper.metadataVerifiedBy?.name ?? paper.metadataVerifiedBy?.email ?? "someone"}
                                  {" · "}
                                  {paper.metadataVerifiedAt.toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a href={viewHref} className="btn btn-primary btn-sm">
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
  )
}
