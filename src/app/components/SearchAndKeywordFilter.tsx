export function SearchAndKeywordFilter({
  action,
  q,
  keyword,
}: {
  action: string
  q?: string
  keyword?: string
}) {
  return (
    <>
      <form className="mb-6" action={action} method="get">
        {keyword && <input type="hidden" name="keyword" value={keyword} />}
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search title, abstract, or DOI..."
          className="input input-bordered w-full"
        />
      </form>

      {keyword && (
        <div className="flex items-center gap-2 mb-5 -mt-3">
          <span className="text-sm text-base-content/50">Filtering by keyword:</span>
          <span className="badge badge-primary gap-1">
            {keyword}
            <a
              href={(() => {
                const sp = new URLSearchParams()
                if (q) sp.set("q", q)
                return sp.toString() ? `${action}?${sp.toString()}` : action
              })()}
              className="ml-1"
              aria-label="Clear keyword filter"
            >
              ✕
            </a>
          </span>
        </div>
      )}
    </>
  )
}
