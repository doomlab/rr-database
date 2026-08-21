import db from "db"
import { Pagination } from "../../../components/Pagination"

const PAGE_SIZE = 50

export default async function SuggestionsQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>
}) {
  const { tab: tabParam, page: pageParam } = await searchParams
  const tab = tabParam === "resolved" ? "resolved" : "new"
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const [newCount, resolvedCount] = await Promise.all([
    db.articleSuggestion.count({ where: { resolved: false } }),
    db.articleSuggestion.count({ where: { resolved: true } }),
  ])

  const where = { resolved: tab === "resolved" }

  const [suggestions, totalSuggestions] = await Promise.all([
    db.articleSuggestion.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    db.articleSuggestion.count({ where }),
  ])

  const totalPages = Math.ceil(totalSuggestions / PAGE_SIZE)
  const buildHref = (p: number) => `/admin/suggestions?tab=${tab}&page=${p}`

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Article suggestions</h1>
      <p className="text-base-content/60 mb-6">Papers suggested by users that aren't in the database yet.</p>

      <div className="tabs tabs-boxed w-fit mb-6">
        <a href="/admin/suggestions?tab=new" className={`tab ${tab === "new" ? "tab-active" : ""}`}>
          New ({newCount})
        </a>
        <a href="/admin/suggestions?tab=resolved" className={`tab ${tab === "resolved" ? "tab-active" : ""}`}>
          Resolved ({resolvedCount})
        </a>
      </div>

      {suggestions.length === 0 ? (
        <p className="text-base-content/40">{tab === "resolved" ? "Nothing resolved yet." : "Nothing to review."}</p>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-base-200">
            {suggestions.map((s) => (
              <li key={s.id} className="py-4 flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <h2 className="font-semibold text-base leading-snug">{s.title ?? "(no title given)"}</h2>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-base text-base-content/50">
                    {s.authors && <span>{s.authors}</span>}
                    {s.year && <span>{s.year}</span>}
                    {s.doi && <span className="font-mono">{s.doi}</span>}
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="link">
                        link
                      </a>
                    )}
                  </div>
                  <p className="text-base text-base-content/40">
                    Suggested by {s.user.name ?? s.user.email}
                    {s.note ? ` — "${s.note}"` : ""}
                  </p>
                </div>
                <a href={`/admin/suggestions/${s.id}`} className="btn btn-primary btn-sm shrink-0">
                  {tab === "resolved" ? "View" : "Review"}
                </a>
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
        </>
      )}
    </div>
  )
}
