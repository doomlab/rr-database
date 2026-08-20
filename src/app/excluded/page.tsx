import { Navbar } from "../components/Navbar"
import { Pagination } from "../components/Pagination"
import { PaperFavoriteButton } from "../components/PaperFavoriteButton"
import { ReportButton } from "../components/ReportButton"
import { getBlitzContext } from "../blitz-server"
import db from "db"

const PAGE_SIZE = 50

export const metadata = { title: "Excluded – RR Database" }

export default async function ExcludedPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const ctx = await getBlitzContext()
  const userId = ctx.session.userId as number | undefined

  const [papers, totalPapers, favoritedIds, reportedIds] = await Promise.all([
    db.paper.findMany({
      where: { status: "REJECTED" },
      include: { authors: { include: { author: true }, orderBy: { position: "asc" } } },
      orderBy: { reviewedAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    db.paper.count({ where: { status: "REJECTED" } }),
    userId
      ? db.paperFavorite
          .findMany({ where: { userId }, select: { paperId: true } })
          .then((rows) => new Set(rows.map((r) => r.paperId)))
      : Promise.resolve(new Set<number>()),
    userId
      ? db.paperReport
          .findMany({ where: { userId }, select: { paperId: true } })
          .then((rows) => new Set(rows.map((r) => r.paperId)))
      : Promise.resolve(new Set<number>()),
  ])

  const totalPages = Math.ceil(totalPapers / PAGE_SIZE)
  const buildHref = (p: number) => `/excluded?page=${p}`

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <Navbar />

      <div className="flex-1 w-full px-10 py-8">
        <div className="w-[90%] mx-auto">
          <h1 className="text-2xl font-semibold mb-1">Excluded</h1>
          <p className="text-base text-base-content/60 mb-8">
            {totalPapers} paper{totalPapers === 1 ? "" : "s"} reviewed and excluded from the database
          </p>

          {papers.length === 0 ? (
            <p className="text-base-content/40 py-16 text-center">
              Nothing has been excluded yet.
            </p>
          ) : (
            <>
              <ul className="flex flex-col divide-y divide-base-200">
                {papers.map((paper) => (
                  <li
                    key={paper.id}
                    className="py-5 hover:bg-base-200/40 px-3 -mx-3 rounded-lg transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="font-semibold text-base leading-snug mb-1">{paper.title}</h2>
                        {paper.abstract && (
                          <p className="text-base text-base-content/60 mb-2 line-clamp-2">
                            {paper.abstract}
                          </p>
                        )}
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
                        {paper.reviewNote && (
                          <p className="text-base text-base-content/60 mt-2">
                            <span className="font-medium">Reason:</span> {paper.reviewNote}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <ReportButton
                          paperId={paper.id}
                          initialReported={reportedIds.has(paper.id)}
                          isLoggedIn={!!userId}
                        />
                        <PaperFavoriteButton
                          paperId={paper.id}
                          initialFavorited={favoritedIds.has(paper.id)}
                          isLoggedIn={!!userId}
                        />
                        <a href={`/papers/${paper.id}`} className="btn btn-primary btn-sm">
                          View
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
