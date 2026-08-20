export function AdminEnrichPanel({
  paperId,
  hasOpenAlexApiKey,
}: {
  paperId: number
  hasOpenAlexApiKey: boolean
}) {
  return (
    <>
      {hasOpenAlexApiKey ? (
        <a href={`/admin/papers/${paperId}/pull?source=openalex`} className="btn btn-accent btn-md text-base">
          Pull from OpenAlex
        </a>
      ) : (
        <div className="tooltip" data-tip="Add an OpenAlex key in your account settings to enable pulling">
          <button type="button" className="btn btn-accent btn-md text-base" disabled>
            Pull from OpenAlex
          </button>
        </div>
      )}
      <a href={`/admin/papers/${paperId}/pull?source=crossref`} className="btn btn-info btn-md text-base">
        Pull from Crossref
      </a>
    </>
  )
}
