import { MultiValueFilter } from "./MultiValueFilter"
import { OA_STATUS_OPTIONS } from "src/lib/openAccessStatus"

const STAGE_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: "1", label: "Stage 1", color: "badge-info" },
  { value: "2", label: "Stage 2", color: "badge-accent" },
  { value: "both", label: "Stage 1 + 2", color: "badge-primary" },
  { value: "other", label: "Other", color: "badge-neutral" },
  { value: "pci", label: "PCI RR page", color: "badge-warning" },
]

const VERIFIED_OPTIONS: { value: string; label: string }[] = [
  { value: "yes", label: "Verified only" },
  { value: "no", label: "Needs review" },
]

type FilterParams = {
  q?: string
  keyword?: string
  venue?: string
  stage?: string
  materials?: string
  verified?: string
  oaStatus?: string
  yearFrom?: string
  yearTo?: string
}

export function SearchAndKeywordFilter({
  action,
  q,
  keyword,
  stage,
  materials,
  verified,
  showStageFilter = false,
  showAdvancedFilters = false,
  oaStatus,
  venue,
  yearFrom,
  yearTo,
}: FilterParams & {
  action: string
  showStageFilter?: boolean
  showAdvancedFilters?: boolean
}) {
  const keywords = keyword ? keyword.split(",").filter(Boolean) : []
  const venues = venue ? venue.split(",").filter(Boolean) : []
  const current: FilterParams = { q, keyword, venue, stage, materials, verified, oaStatus, yearFrom, yearTo }

  const hrefFor = (overrides: FilterParams) => {
    const merged = { ...current, ...overrides }
    const sp = new URLSearchParams()
    Object.entries(merged).forEach(([key, value]) => {
      if (value) sp.set(key, value)
    })
    return sp.toString() ? `${action}?${sp.toString()}` : action
  }

  const stageLabel = STAGE_OPTIONS.find((o) => o.value === stage)?.label
  const oaStatusLabel =
    oaStatus === "none" ? "Not checked yet" : OA_STATUS_OPTIONS.find((o) => o.value === oaStatus)?.label
  const verifiedLabel = VERIFIED_OPTIONS.find((o) => o.value === verified)?.label
  const yearLabel = yearFrom || yearTo ? `${yearFrom ?? "…"}–${yearTo ?? "…"}` : undefined

  const activeCount =
    (stage ? 1 : 0) +
    (materials ? 1 : 0) +
    (verified ? 1 : 0) +
    (oaStatus ? 1 : 0) +
    keywords.length +
    venues.length +
    (yearFrom || yearTo ? 1 : 0)
  const hasActiveFilters = activeCount > 0

  return (
    <div className="mb-6">
      <form action={action} method="get">
        {keyword && <input type="hidden" name="keyword" value={keyword} />}
        {venue && <input type="hidden" name="venue" value={venue} />}
        {stage && <input type="hidden" name="stage" value={stage} />}
        {materials && <input type="hidden" name="materials" value={materials} />}
        {verified && <input type="hidden" name="verified" value={verified} />}
        {oaStatus && <input type="hidden" name="oaStatus" value={oaStatus} />}
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
              <span className="text-base text-base-content/50 w-24 shrink-0">Stage</span>
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
              <a
                href={hrefFor({ materials: materials ? undefined : "yes" })}
                className={`badge ${materials ? "badge-neutral" : "badge-outline"}`}
              >
                Has materials
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base text-base-content/50 w-24 shrink-0">Open access</span>
              <a
                href={hrefFor({ oaStatus: undefined })}
                className={`badge ${!oaStatus ? "badge-neutral" : "badge-outline"}`}
              >
                All
              </a>
              {OA_STATUS_OPTIONS.map((opt) => (
                <a
                  key={opt.value}
                  href={hrefFor({ oaStatus: oaStatus === opt.value ? undefined : opt.value })}
                  className={`badge ${oaStatus === opt.value ? "badge-success" : "badge-outline"}`}
                >
                  {opt.label}
                </a>
              ))}
              <a
                href={hrefFor({ oaStatus: oaStatus === "none" ? undefined : "none" })}
                className={`badge ${oaStatus === "none" ? "badge-warning" : "badge-outline"}`}
              >
                Not checked yet
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base text-base-content/50 w-24 shrink-0">Metadata</span>
              <a href={hrefFor({ verified: undefined })} className={`badge ${!verified ? "badge-neutral" : "badge-outline"}`}>
                All
              </a>
              {VERIFIED_OPTIONS.map((opt) => (
                <a
                  key={opt.value}
                  href={hrefFor({ verified: verified === opt.value ? undefined : opt.value })}
                  className={`badge ${verified === opt.value ? "badge-secondary" : "badge-outline"}`}
                >
                  {opt.label}
                </a>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base text-base-content/50 w-24 shrink-0">Year</span>
              <form action={action} method="get" className="flex items-center gap-2">
                {keyword && <input type="hidden" name="keyword" value={keyword} />}
                {venue && <input type="hidden" name="venue" value={venue} />}
                {stage && <input type="hidden" name="stage" value={stage} />}
                {materials && <input type="hidden" name="materials" value={materials} />}
                {verified && <input type="hidden" name="verified" value={verified} />}
                {oaStatus && <input type="hidden" name="oaStatus" value={oaStatus} />}
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
              <span className="text-base text-base-content/50 w-24 shrink-0 pt-1.5">Keywords</span>
              <MultiValueFilter
                label=""
                placeholder="Search keywords…"
                paramName="keyword"
                values={keywords}
                allowFreeText
              />
            </div>

            <div className="flex flex-wrap items-start gap-2">
              <span className="text-base text-base-content/50 w-24 shrink-0 pt-1.5">Venue</span>
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
              <a href={hrefFor({ stage: undefined })} aria-label="Clear stage filter">✕</a>
            </span>
          )}
          {materials && (
            <span className="badge badge-lg gap-1">
              Has materials
              <a href={hrefFor({ materials: undefined })} aria-label="Clear materials filter">✕</a>
            </span>
          )}
          {oaStatusLabel && (
            <span className="badge badge-lg gap-1">
              {oaStatusLabel}
              <a href={hrefFor({ oaStatus: undefined })} aria-label="Clear open access filter">✕</a>
            </span>
          )}
          {verifiedLabel && (
            <span className="badge badge-lg gap-1">
              {verifiedLabel}
              <a href={hrefFor({ verified: undefined })} aria-label="Clear verified filter">✕</a>
            </span>
          )}
          {yearLabel && (
            <span className="badge badge-lg gap-1">
              {yearLabel}
              <a href={hrefFor({ yearFrom: undefined, yearTo: undefined })} aria-label="Clear year filter">✕</a>
            </span>
          )}
          {keywords.map((kw) => (
            <span key={kw} className="badge badge-lg gap-1">
              {kw}
              <a
                href={hrefFor({ keyword: keywords.filter((k) => k !== kw).join(",") || undefined })}
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
                href={hrefFor({ venue: venues.filter((x) => x !== v).join(",") || undefined })}
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
            <a href={hrefFor({ keyword: undefined })} className="ml-1" aria-label="Clear keyword filter">
              ✕
            </a>
          </span>
        </div>
      )}
    </div>
  )
}
