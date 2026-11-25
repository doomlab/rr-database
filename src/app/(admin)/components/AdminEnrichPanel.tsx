export function AdminEnrichPanel({
  paperId,
  hasOpenAlexApiKey,
  reviewNext,
}: {
  paperId: number
  hasOpenAlexApiKey: boolean
  reviewNext?: string
}) {
  const suffix = reviewNext ? `&next=${encodeURIComponent(reviewNext)}` : ""

  return (
    <div className="dropdown">
      <div tabIndex={0} role="button" className="btn btn-info btn-md text-base">
        Pull data ▾
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-50 w-72 p-2 shadow-md border border-base-300 mt-1"
      >
        <li className={hasOpenAlexApiKey ? "" : "menu-disabled"}>
          {hasOpenAlexApiKey ? (
            <a
              href={`/admin/papers/${paperId}/pull?source=openalex${suffix}`}
              title="Fetch this item's abstract, authors, open access status and citations from OpenAlex, then review before saving"
            >
              Pull OpenAlex
            </a>
          ) : (
            <span title="Add an OpenAlex key in your account settings to enable pulling">
              Pull OpenAlex (needs an OpenAlex key)
            </span>
          )}
        </li>
        <li>
          <a
            href={`/admin/papers/${paperId}/pull?source=crossref${suffix}`}
            title="Fetch this item's title, authors, venue and publication details from Crossref, then review before saving"
          >
            Pull Crossref
          </a>
        </li>
      </ul>
    </div>
  )
}
