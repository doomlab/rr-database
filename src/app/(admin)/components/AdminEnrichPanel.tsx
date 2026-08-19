export function AdminEnrichPanel({ paperId }: { paperId: number }) {
  return (
    <>
      <a href={`/admin/papers/${paperId}/pull?source=openalex`} className="btn btn-accent btn-md text-base">
        Pull from OpenAlex
      </a>
      <a href={`/admin/papers/${paperId}/pull?source=crossref`} className="btn btn-info btn-md text-base">
        Pull from Crossref
      </a>
    </>
  )
}
