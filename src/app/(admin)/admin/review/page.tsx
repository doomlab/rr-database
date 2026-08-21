import db from "db"
import { Pagination } from "../../../components/Pagination"
import { SearchAndKeywordFilter } from "../../../components/SearchAndKeywordFilter"
import { clusterPapersByTitle } from "src/lib/duplicateClusters"
import { STUDY_PAPER_ROLE_LABELS } from "src/lib/studyPaperRoles"
import { BulkRejectButton } from "./BulkRejectButton"

const PAGE_SIZE = 50

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; keyword?: string; page?: string }>
}) {
  const params = await searchParams
  const q = params.q?.trim() || undefined
  const keyword = params.keyword?.trim().toLowerCase() || undefined
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const where = {
    status: "PENDING_REVIEW" as const,
    canonicalPaperId: null,
    ...(q
      ? {
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
        }
      : {}),
    ...(keyword ? { keywords: { has: keyword } } : {}),
  }

  const [papers, totalPapers] = await Promise.all([
    db.paper.findMany({
      where,
      include: {
        authors: { include: { author: true }, orderBy: { position: "asc" } },
        studyPaper: { select: { studyId: true } },
      },
      orderBy: [{ modelScore: "desc" }, { createdAt: "desc" }],
      skip,
      take: PAGE_SIZE,
    }),
    db.paper.count({ where }),
  ])

  const totalPages = Math.ceil(totalPapers / PAGE_SIZE)
  const buildHref = (p: number) => {
    const sp = new URLSearchParams()
    if (q) sp.set("q", q)
    if (keyword) sp.set("keyword", keyword)
    sp.set("page", String(p))
    return `/admin/review?${sp.toString()}`
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Review queue</h1>
      <p className="text-base text-base-content/60 mb-6">
        Candidates awaiting a decision — discovered or imported but not yet confirmed. Click into
        a paper to see full details, or pull fresh data from OpenAlex/Crossref, before deciding.
      </p>

      <SearchAndKeywordFilter action="/admin/review" q={q} keyword={keyword} />

      <div className="flex items-center justify-between mb-5">
        <p className="text-base text-base-content/60">
          <span className="font-semibold text-base-content">{totalPapers}</span> candidate
          {totalPapers === 1 ? "" : "s"} awaiting review
        </p>
      </div>

      {papers.length === 0 ? (
        <div className="text-center py-16 text-base-content/40">
          <p className="text-lg">
            {q || keyword ? "No results match your search." : "Nothing to review."}
          </p>
          {(q || keyword) && (
            <a href="/admin/review" className="link link-primary text-sm mt-2 inline-block">
              Clear search
            </a>
          )}
        </div>
      ) : (
        <>
          {(() => {
            const nextIdsById = new Map<number, string>()
            papers.forEach((paper, idx) => {
              nextIdsById.set(
                paper.id,
                papers
                  .slice(idx + 1, idx + 11)
                  .map((r) => r.id)
                  .join(",")
              )
            })

            // Group probable duplicates within this page (e.g. a flood of
            // near-identical noise hits from a discovery pull) so they can be
            // dismissed together instead of one at a time. Ordered so each
            // group appears where its first (highest-ranked) member would.
            const groups = clusterPapersByTitle(papers, 1).sort((a, b) => {
              const ai = papers.findIndex((p) => p.id === a[0]!.id)
              const bi = papers.findIndex((p) => p.id === b[0]!.id)
              return ai - bi
            })

            return (
              <ul className="flex flex-col divide-y divide-base-200">
                {groups.map((group) => (
                  <li key={group[0]!.id} className="py-5">
                    {group.length > 1 && (
                      <div className="flex items-center justify-between gap-4 mb-3 px-3 py-2 rounded-lg bg-warning/10">
                        <p className="text-base text-base-content/70">
                          {group.length} papers with very similar titles — probably the same noise
                          hit or duplicate.
                        </p>
                        <BulkRejectButton paperIds={group.map((p) => p.id)} />
                      </div>
                    )}
                    <ul className="flex flex-col divide-y divide-base-200">
                      {group.map((paper) => (
                        <li
                          key={paper.id}
                          className="py-5 first:pt-0 hover:bg-base-200/40 px-3 -mx-3 rounded-lg transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <h2 className="font-semibold text-base leading-snug mb-1">
                                {paper.title}
                              </h2>
                              {(() => {
                                const pcirrRole = (paper.pcirrMetadata as { role?: string } | null)
                                  ?.role
                                if (!pcirrRole) return null
                                const label = STUDY_PAPER_ROLE_LABELS[pcirrRole] ?? pcirrRole
                                return (
                                  <div className="mb-2">
                                    <span className="badge badge-info">{label}</span>
                                    {paper.studyPaper && (
                                      <a
                                        href={`/studies/${paper.studyPaper.studyId}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="link link-primary text-base ml-2"
                                      >
                                        auto-linked to study #{paper.studyPaper.studyId}
                                      </a>
                                    )}
                                  </div>
                                )
                              })()}
                              {paper.abstract && (
                                <p className="text-base text-base-content/60 mb-2 line-clamp-2">
                                  {paper.abstract}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/50">
                                {paper.authors.length > 0 && (
                                  <>
                                    <span>
                                      {paper.authors.map((pa) => pa.author.name).join(", ")}
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
                                {paper.doi && (
                                  <>
                                    <span>·</span>
                                    <a
                                      href={`https://doi.org/${paper.doi}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="link link-primary"
                                    >
                                      {paper.doi}
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={`/admin/review/${paper.id}${
                                  nextIdsById.get(paper.id) ? `?next=${nextIdsById.get(paper.id)}` : ""
                                }`}
                                className="btn btn-primary btn-sm"
                              >
                                View
                              </a>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )
          })()}
          <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
        </>
      )}
    </div>
  )
}
