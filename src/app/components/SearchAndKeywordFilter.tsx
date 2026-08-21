import { MultiValueFilter } from "./MultiValueFilter"

const STAGE_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: "1", label: "Stage 1", color: "badge-info" },
  { value: "2", label: "Stage 2", color: "badge-accent" },
  { value: "both", label: "Stage 1 + 2", color: "badge-primary" },
]

const OPEN_ACCESS_OPTIONS: { value: string; label: string }[] = [
  { value: "yes", label: "Open access" },
  { value: "no", label: "Not open access" },
]

export function SearchAndKeywordFilter({
  action,
  q,
  keyword,
  stage,
  showStageFilter = false,
  showAdvancedFilters = false,
  openAccess,
  venue,
  yearFrom,
  yearTo,
}: {
  action: string
  q?: string
  keyword?: string
  stage?: string
  showStageFilter?: boolean
  showAdvancedFilters?: boolean
  openAccess?: string
  venue?: string
  yearFrom?: string
  yearTo?: string
}) {
  const keywords = keyword ? keyword.split(",").filter(Boolean) : []
  const venues = venue ? venue.split(",").filter(Boolean) : []

  const hrefFor = (next: { stage?: string; openAccess?: string }) => {
    const sp = new URLSearchParams()
    if (q) sp.set("q", q)
    if (keyword) sp.set("keyword", keyword)
    if (venue) sp.set("venue", venue)
    if (yearFrom) sp.set("yearFrom", yearFrom)
    if (yearTo) sp.set("yearTo", yearTo)
    const nextStage = "stage" in next ? next.stage : stage
    const nextOpenAccess = "openAccess" in next ? next.openAccess : openAccess
    if (nextStage) sp.set("stage", nextStage)
    if (nextOpenAccess) sp.set("openAccess", nextOpenAccess)
    return sp.toString() ? `${action}?${sp.toString()}` : action
  }

  return (
    <>
      <form className="mb-4" action={action} method="get">
        {keyword && <input type="hidden" name="keyword" value={keyword} />}
        {venue && <input type="hidden" name="venue" value={venue} />}
        {stage && <input type="hidden" name="stage" value={stage} />}
        {openAccess && <input type="hidden" name="openAccess" value={openAccess} />}
        <div className="flex items-center gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search title, abstract, or DOI..."
            className="input input-bordered w-full"
          />
          {showAdvancedFilters && (
            <>
              <input
                type="number"
                name="yearFrom"
                defaultValue={yearFrom}
                placeholder="Year from"
                className="input input-bordered w-32 text-base"
              />
              <input
                type="number"
                name="yearTo"
                defaultValue={yearTo}
                placeholder="Year to"
                className="input input-bordered w-32 text-base"
              />
              <button type="submit" className="btn btn-primary">
                Search
              </button>
            </>
          )}
        </div>
      </form>

      {showStageFilter && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="text-base text-base-content/50">Filter by stage:</span>
          <a href={hrefFor({ stage: undefined })} className={`badge badge-lg ${!stage ? "badge-neutral" : "badge-outline"}`}>
            All
          </a>
          {STAGE_OPTIONS.map((opt) => (
            <a
              key={opt.value}
              href={hrefFor({ stage: stage === opt.value ? undefined : opt.value })}
              className={`badge badge-lg ${stage === opt.value ? opt.color : "badge-outline"}`}
            >
              {opt.label}
            </a>
          ))}
        </div>
      )}

      {showAdvancedFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className="text-base text-base-content/50">Access:</span>
          {OPEN_ACCESS_OPTIONS.map((opt) => (
            <a
              key={opt.value}
              href={hrefFor({ openAccess: openAccess === opt.value ? undefined : opt.value })}
              className={`badge badge-lg ${openAccess === opt.value ? "badge-success" : "badge-outline"}`}
            >
              {opt.label}
            </a>
          ))}
        </div>
      )}

      {showAdvancedFilters && (
        <div className="flex flex-wrap items-start gap-6 mb-5">
          <MultiValueFilter
            label="Keywords"
            placeholder="Search keywords…"
            paramName="keyword"
            values={keywords}
          />
          <MultiValueFilter label="Venue" placeholder="Search venues…" paramName="venue" values={venues} />
        </div>
      )}

      {!showAdvancedFilters && keyword && (
        <div className="flex items-center gap-2 mb-5 -mt-3">
          <span className="text-sm text-base-content/50">Filtering by keyword:</span>
          <span className="badge badge-primary gap-1">
            {keyword}
            <a
              href={(() => {
                const sp = new URLSearchParams()
                if (q) sp.set("q", q)
                if (stage) sp.set("stage", stage)
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
