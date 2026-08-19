import { Navbar } from "../components/Navbar"
import { Pagination } from "../components/Pagination"
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

  const [papers, totalPapers] = await Promise.all([
    db.paper.findMany({
      where: { status: "REJECTED" },
      include: { authors: { include: { author: true }, orderBy: { position: "asc" } } },
      orderBy: { reviewedAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    db.paper.count({ where: { status: "REJECTED" } }),
  ])

  const totalPages = Math.ceil(totalPapers / PAGE_SIZE)
  const buildHref = (p: number) => `/excluded?page=${p}`

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <Navbar />

      <div className="flex-1 w-full px-10 py-8">
        <div className="w-[90%] mx-auto">
          <h1 className="text-2xl font-semibold mb-1">Excluded</h1>
          <p className="text-sm text-base-content/60 mb-8">
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
                  <li key={paper.id} className="py-5">
                    <h2 className="font-semibold text-base leading-snug mb-1">{paper.title}</h2>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/50 mb-1">
                      {paper.authors.length > 0 && (
                        <span>{paper.authors.map((pa) => pa.author.name).join(", ")}</span>
                      )}
                      {paper.year && <span>{paper.year}</span>}
                      {paper.venue && <span className="italic">{paper.venue}</span>}
                    </div>
                    {paper.reviewNote && (
                      <p className="text-sm text-base-content/60">
                        <span className="font-medium">Reason:</span> {paper.reviewNote}
                      </p>
                    )}
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
