import db from "db"
import { Pagination } from "../../../components/Pagination"

const PAGE_SIZE = 50

const FIELDS = [
  "title",
  "doi",
  "abstract",
  "year",
  "venue",
  "volume",
  "issue",
  "pages",
  "publisher",
  "url",
  "issn",
  "language",
  "itemType",
  "pdfUrl",
  "openAccess",
  "openAccessStatus",
  "citedByCount",
  "openalexId",
  "registrationUrl",
  "registrationPlatform",
  "biasLevel",
  "openDataUrl",
  "openCodeUrl",
  "openMaterialsUrl",
  "zoteroNotes",
  "jmirBadgeType",
  "jmirBadgeCounterpartDoi",
] as const

export default async function MetadataQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>
}) {
  const { tab: tabParam, page: pageParam } = await searchParams
  const tab = tabParam === "resolved" ? "resolved" : "new"
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const [newCount, resolvedCount] = await Promise.all([
    db.metadataEditSuggestion.count({ where: { resolved: false } }),
    db.metadataEditSuggestion.count({ where: { resolved: true } }),
  ])

  const where = { resolved: tab === "resolved" }

  const [suggestions, totalSuggestions] = await Promise.all([
    db.metadataEditSuggestion.findMany({
      where,
      include: {
        paper: { select: { id: true, title: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    db.metadataEditSuggestion.count({ where }),
  ])

  const totalPages = Math.ceil(totalSuggestions / PAGE_SIZE)
  const buildHref = (p: number) => `/admin/metadata?tab=${tab}&page=${p}`

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Metadata edit suggestions</h1>
      <p className="text-base-content/60 mb-6">
        Corrections suggested by users on a paper's own page, waiting on an admin to review and apply.
      </p>

      <div className="tabs tabs-boxed w-fit mb-6">
        <a href="/admin/metadata?tab=new" className={`tab ${tab === "new" ? "tab-active" : ""}`}>
          New ({newCount})
        </a>
        <a href="/admin/metadata?tab=resolved" className={`tab ${tab === "resolved" ? "tab-active" : ""}`}>
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
                  <h2 className="font-semibold text-base leading-snug">{s.paper.title}</h2>
                  <div className="text-base text-base-content/60 space-y-0.5">
                    {(() => {
                      const authorNames = (s.authors as unknown as { id: number | null; name: string }[]).map(
                        (a) => a.name
                      )
                      return (
                        authorNames.length > 0 && (
                          <div>
                            <span className="font-medium">authors:</span> {authorNames.join(", ")}
                          </div>
                        )
                      )
                    })()}
                    {FIELDS.filter((f) => s[f] !== null && s[f] !== undefined).map((f) => (
                      <div key={f}>
                        <span className="font-medium">{f}:</span> {String(s[f])}
                      </div>
                    ))}
                  </div>
                  <p className="text-base text-base-content/40">
                    Suggested by {s.user.name ?? s.user.email}
                    {s.note ? ` — "${s.note}"` : ""}
                  </p>
                </div>
                <a href={`/admin/metadata/${s.id}`} className="btn btn-primary btn-sm shrink-0">
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
