import db from "db"
import { Pagination } from "../../../components/Pagination"

const PAGE_SIZE = 50

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const where = { status: "PENDING_REVIEW" as const, canonicalPaperId: null }

  const [papers, totalPapers] = await Promise.all([
    db.paper.findMany({
      where,
      include: { authors: { include: { author: true }, orderBy: { position: "asc" } } },
      orderBy: [{ modelScore: "desc" }, { createdAt: "desc" }],
      skip,
      take: PAGE_SIZE,
    }),
    db.paper.count({ where }),
  ])

  const totalPages = Math.ceil(totalPapers / PAGE_SIZE)
  const buildHref = (p: number) => `/admin/review?page=${p}`

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Review queue</h1>
      <p className="text-base-content/60 mb-8">
        {totalPapers} candidate{totalPapers === 1 ? "" : "s"} awaiting a decision — imported
        from the staging Zotero library, never confirmed into production. Click into a paper to
        see full details before deciding.
      </p>

      {papers.length === 0 ? (
        <p className="text-base-content/40">Nothing to review.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Authors</th>
                  <th>Year</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {papers.map((paper, idx) => {
                  const nextIds = papers
                    .slice(idx + 1, idx + 11)
                    .map((r) => r.id)
                    .join(",")
                  return (
                    <tr key={paper.id}>
                      <td className="max-w-sm">
                        <p className="font-medium line-clamp-2">{paper.title}</p>
                        {paper.doi && (
                          <a
                            href={`https://doi.org/${paper.doi}`}
                            target="_blank"
                            rel="noreferrer"
                            className="link link-primary text-xs"
                          >
                            {paper.doi}
                          </a>
                        )}
                      </td>
                      <td className="text-sm text-base-content/70 max-w-xs">
                        {paper.authors
                          .slice(0, 3)
                          .map((pa) => pa.author.name)
                          .join(", ")}
                        {paper.authors.length > 3 && " et al."}
                      </td>
                      <td>{paper.year ?? "—"}</td>
                      <td>
                        <a
                          href={`/admin/review/${paper.id}${nextIds ? `?next=${nextIds}` : ""}`}
                          className="btn btn-outline btn-xs"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
        </>
      )}
    </div>
  )
}
