import db from "db"
import { PaperReviewActions } from "../../components/PaperReviewActions"

export default async function ReviewQueuePage() {
  const papers = await db.paper.findMany({
    where: { status: "PENDING_REVIEW" },
    include: { authors: { include: { author: true }, orderBy: { position: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Review queue</h1>
      <p className="text-base-content/60 mb-8">
        {papers.length} candidate{papers.length === 1 ? "" : "s"} awaiting a decision — imported
        from the staging Zotero library, never confirmed into production.
      </p>

      {papers.length === 0 ? (
        <p className="text-base-content/40">Nothing to review.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-base-200">
          {papers.map((paper) => (
            <li key={paper.id} className="py-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-semibold text-base leading-snug">{paper.title}</h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/50 mt-1">
                  {paper.authors.length > 0 && (
                    <span>{paper.authors.map((pa) => pa.author.name).join(", ")}</span>
                  )}
                  {paper.year && <span>{paper.year}</span>}
                  {paper.doi && <span className="font-mono">{paper.doi}</span>}
                </div>
              </div>
              <PaperReviewActions paperId={paper.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
