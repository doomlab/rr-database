import { notFound } from "next/navigation"
import db from "db"
import { fetchCrossrefFields, fetchOpenAlexFields, type EnrichmentFields } from "src/lib/enrichment"
import { PaperEditForm, type FieldKey } from "./PaperEditForm"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const paper = await db.paper.findUnique({ where: { id: Number(id) }, select: { title: true } })
  return { title: paper ? `Pull data — ${paper.title}` : "Pull data – Admin" }
}

export default async function PullDataPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ source?: string }>
}) {
  const { id } = await params
  const { source: sourceParam } = await searchParams
  const source = sourceParam === "crossref" ? "crossref" : "openalex"

  const paper = await db.paper.findUnique({
    where: { id: Number(id) },
    include: { studyPaper: { select: { studyId: true } } },
  })
  if (!paper) notFound()

  const backHref = paper.studyPaper ? `/studies/${paper.studyPaper.studyId}` : "/"

  let fetched: EnrichmentFields = {}
  let fetchError: string | null = null
  try {
    fetched = source === "openalex" ? await fetchOpenAlexFields(paper) : await fetchCrossrefFields(paper)
  } catch (e: any) {
    fetchError = e.message ?? "Lookup failed"
  }

  const current: Record<FieldKey, string | number | boolean | null> = {
    title: paper.title,
    doi: paper.doi,
    abstract: paper.abstract,
    year: paper.year,
    venue: paper.venue,
    volume: paper.volume,
    issue: paper.issue,
    pages: paper.pages,
    issn: paper.issn,
    publisher: paper.publisher,
    language: paper.language,
    url: paper.url,
    pdfUrl: paper.pdfUrl,
    openAccess: paper.openAccess,
    openAccessStatus: paper.openAccessStatus,
    citedByCount: paper.citedByCount,
    openalexId: paper.openalexId,
  }

  const initial: Record<FieldKey, string | number | boolean | null> = { ...current }
  for (const key of Object.keys(current) as FieldKey[]) {
    const fetchedValue = (fetched as any)[key]
    if (fetchedValue != null) initial[key] = fetchedValue
  }

  return (
    <div className="max-w-3xl mx-auto">
      <a href={backHref} className="text-sm text-base-content/50 hover:text-base-content mb-6 inline-block">
        ← Back to article
      </a>

      <h1 className="text-2xl font-bold leading-snug mb-1">
        Review data from {source === "openalex" ? "OpenAlex" : "Crossref"}
      </h1>
      <p className="text-base-content/60 mb-8">{paper.title}</p>

      {fetchError ? (
        <p className="text-error">{fetchError}</p>
      ) : (
        <PaperEditForm paperId={paper.id} source={source} initial={initial} backHref={backHref} />
      )}
    </div>
  )
}
