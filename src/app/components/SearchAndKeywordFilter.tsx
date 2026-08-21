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

  // Drop one key from the current filter set — used by the removable summary chips.
  const hrefWithout = (omit: "stage" | "openAccess" | "keyword" | "venue" | "year") => {
    const sp = new URLSearchParams()
    if (q) sp.set("q", q)
    if (omit !== "keyword" && keyword) sp.set("keyword", keyword)
    if (omit !== "venue" && venue) sp.set("venue", venue)
    if (omit !== "year" && yearFrom) sp.set("yearFrom", yearFrom)
    if (omit !== "year" && yearTo) sp.set("yearTo", yearTo)
    if (omit !== "stage" && stage) sp.set("stage", stage)
    if (omit !== "openAccess" && openAccess) sp.set("openAccess", openAccess)
    return sp.toString() ? `${action}?${sp.toString()}` : action
  }

  const stageLabel = STAGE_OPTIONS.find((o) => o.value === stage)?.label
  const openAccessLabel = OPEN_ACCESS_OPTIONS.find((o) => o.value === openAccess)?.label
  const yearLabel =
    yearFrom || yearTo ? `${yearFrom ?? "…"}–${yearTo ?? "…"}` : undefined

  const activeCount =
    (stage ? 1 : 0) + (openAccess ? 1 : 0) + keywords.length + venues.length + (yearFrom || yearTo ? 1 : 0)
  const hasActiveFilters = activeCount > 0

  return (
    <div className="mb-6">
      <form action={action} method="get">
        {keyword && <input type="hidden" name="keyword" value={keyword} />}
        {venue && <input type="hidden" name="venue" value={venue} />}
        {stage && <input type="hidden" name="stage" value={stage} />}
        {openAccess && <input type="hidden" name="openAccess" value={openAccess} />}
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search title, abstract, or DOI..."
          className="input input-bordered w-full"
        />
      </form>

      {showAdvancedFilters && (
        <details className="mt-3 group" open={hasActiveFilters}>
          <summary className="cursor-pointer select-none text-base font-medium text-base-content/60 hover:text-base-content flex items-center gap-2 w-fit">
            <span className="transition-transform group-open:rotate-90">▸</span>
            Filters
            {hasActiveFilters && <span className="badge badge-primary badge-sm">{activeCount}</span>}
          </summary>

          <div className="mt-3 p-4 bg-base-200/50 rounded-lg flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base text-base-content/50 w-20 shrink-0">Stage</span>
              <a href={hrefFor({ stage: undefined })} className={`badge ${!stage ? "badge-neutral" : "badge-outline"}`}>
                All
              </a>
              {STAGE_OPTIONS.map((opt) => (
                <a
                  key={opt.value}
                  href={hrefFor({ stage: stage === opt.value ? undefined : opt.value })}
                  className={`badge ${stage === opt.value ? opt.color : "badge-outline"}`}
                >
                  {opt.label}
                </a>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base text-base-content/50 w-20 shrink-0">Access</span>
              {OPEN_ACCESS_OPTIONS.map((opt) => (
                <a
                  key={opt.value}
                  href={hrefFor({ openAccess: openAccess === opt.value ? undefined : opt.value })}
                  className={`badge ${openAccess === opt.value ? "badge-success" : "badge-outline"}`}
                >
                  {opt.label}
                </a>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base text-base-content/50 w-20 shrink-0">Year</span>
              <form action={action} method="get" className="flex items-center gap-2">
                {keyword && <input type="hidden" name="keyword" value={keyword} />}
                {venue && <input type="hidden" name="venue" value={venue} />}
                {stage && <input type="hidden" name="stage" value={stage} />}
                {openAccess && <input type="hidden" name="openAccess" value={openAccess} />}
                {q && <input type="hidden" name="q" value={q} />}
                <input
                  type="number"
                  name="yearFrom"
                  defaultValue={yearFrom}
                  placeholder="From"
                  className="input input-bordered input-sm w-24 text-base"
                />
                <span className="text-base-content/40">–</span>
                <input
                  type="number"
                  name="yearTo"
                  defaultValue={yearTo}
                  placeholder="To"
                  className="input input-bordered input-sm w-24 text-base"
                />
                <button type="submit" className="btn btn-primary btn-sm">
                  Apply
                </button>
              </form>
            </div>

            <div className="flex flex-wrap items-start gap-2">
              <span className="text-base text-base-content/50 w-20 shrink-0 pt-1.5">Keywords</span>
              <MultiValueFilter
                label=""
                placeholder="Search keywords…"
                paramName="keyword"
                values={keywords}
                allowFreeText
              />
            </div>

            <div className="flex flex-wrap items-start gap-2">
              <span className="text-base text-base-content/50 w-20 shrink-0 pt-1.5">Venue</span>
              <MultiValueFilter
                label=""
                placeholder="Search venues…"
                paramName="venue"
                values={venues}
                allowFreeText
              />
            </div>
          </div>
        </details>
      )}

      {showAdvancedFilters && hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {stageLabel && (
            <span className="badge badge-lg gap-1">
              {stageLabel}
              <a href={hrefWithout("stage")} aria-label="Clear stage filter">✕</a>
            </span>
          )}
          {openAccessLabel && (
            <span className="badge badge-lg gap-1">
              {openAccessLabel}
              <a href={hrefWithout("openAccess")} aria-label="Clear access filter">✕</a>
            </span>
          )}
          {yearLabel && (
            <span className="badge badge-lg gap-1">
              {yearLabel}
              <a href={hrefWithout("year")} aria-label="Clear year filter">✕</a>
            </span>
          )}
          {keywords.map((kw) => (
            <span key={kw} className="badge badge-lg gap-1">
              {kw}
              <a
                href={(() => {
                  const remaining = keywords.filter((k) => k !== kw)
                  const sp = new URLSearchParams()
                  if (q) sp.set("q", q)
                  if (venue) sp.set("venue", venue)
                  if (yearFrom) sp.set("yearFrom", yearFrom)
                  if (yearTo) sp.set("yearTo", yearTo)
                  if (stage) sp.set("stage", stage)
                  if (openAccess) sp.set("openAccess", openAccess)
                  if (remaining.length > 0) sp.set("keyword", remaining.join(","))
                  return sp.toString() ? `${action}?${sp.toString()}` : action
                })()}
                aria-label={`Remove keyword ${kw}`}
              >
                ✕
              </a>
            </span>
          ))}
          {venues.map((v) => (
            <span key={v} className="badge badge-lg gap-1">
              {v}
              <a
                href={(() => {
                  const remaining = venues.filter((x) => x !== v)
                  const sp = new URLSearchParams()
                  if (q) sp.set("q", q)
                  if (keyword) sp.set("keyword", keyword)
                  if (yearFrom) sp.set("yearFrom", yearFrom)
                  if (yearTo) sp.set("yearTo", yearTo)
                  if (stage) sp.set("stage", stage)
                  if (openAccess) sp.set("openAccess", openAccess)
                  if (remaining.length > 0) sp.set("venue", remaining.join(","))
                  return sp.toString() ? `${action}?${sp.toString()}` : action
                })()}
                aria-label={`Remove venue ${v}`}
              >
                ✕
              </a>
            </span>
          ))}
          <a href={q ? `${action}?q=${encodeURIComponent(q)}` : action} className="link link-primary text-base ml-1">
            Clear all
          </a>
        </div>
      )}

      {!showAdvancedFilters && keyword && (
        <div className="flex items-center gap-2 mt-3">
          <span className="text-base text-base-content/50">Filtering by keyword:</span>
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
    </div>
  )
}
