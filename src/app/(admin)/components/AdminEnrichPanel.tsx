import { ButtonTip } from "../../components/ButtonTip"

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
    <>
      {hasOpenAlexApiKey ? (
        <ButtonTip tip="Fetch this item's abstract, authors, open access status and citations from OpenAlex, then review before saving">
          <a
            href={`/admin/papers/${paperId}/pull?source=openalex${suffix}`}
            className="btn btn-accent btn-md text-base"
          >
            Pull OpenAlex
          </a>
        </ButtonTip>
      ) : (
        <div className="tooltip" data-tip="Add an OpenAlex key in your account settings to enable pulling">
          <button type="button" className="btn btn-accent btn-md text-base" disabled>
            Pull OpenAlex
          </button>
        </div>
      )}
      <ButtonTip tip="Fetch this item's title, authors, venue and publication details from Crossref, then review before saving">
        <a
          href={`/admin/papers/${paperId}/pull?source=crossref${suffix}`}
          className="btn btn-info btn-md text-base"
        >
          Pull Crossref
        </a>
      </ButtonTip>
    </>
  )
}
