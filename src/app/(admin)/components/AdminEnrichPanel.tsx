import Link from "next/link"

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
        <Link href={"/admin/api-keys" as any} className="text-sm text-base-content/50 hover:text-base-content link">
          Add an OpenAlex key to enable pulling
        </Link>
      )}
      <a href={`/admin/papers/${paperId}/pull?source=crossref`} className="btn btn-info btn-md text-base">
        Pull from Crossref
      </a>
    </>
  )
}
