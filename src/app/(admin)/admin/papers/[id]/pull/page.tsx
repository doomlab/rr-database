import { notFound } from "next/navigation"
import Link from "next/link"
import db from "db"
import { fetchCrossrefFields, fetchOpenAlexFields, type EnrichmentFields } from "src/lib/enrichment"
import { userHasOpenAlexApiKey } from "src/lib/apiKeyPool"
import { getBlitzContext } from "src/app/blitz-server"
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
  searchParams: Promise<{ source?: string; next?: string }>
}) {
  const { id } = await params
  const { source: sourceParam, next } = await searchParams
  const source = sourceParam === "crossref" ? "crossref" : "openalex"

  const paper = await db.paper.findUnique({
    where: { id: Number(id) },
    include: {
      studyPaper: { select: { studyId: true } },
      authors: { include: { author: true }, orderBy: { position: "asc" } },
    },
  })
  if (!paper) notFound()

  // Still awaiting a decision — go back to judging it in the review queue,
  // preserving the queue's remaining order.
  // Otherwise, only route back to the study page if the paper is actually
  // confirmed — a paper can keep a stale StudyPaper link after being
  // rejected, and that study page 404s once none of its papers are
  // IMPORTED/APPROVED.
  const isConfirmed = paper.status === "IMPORTED" || paper.status === "APPROVED"
  const backHref =
    paper.status === "PENDING_REVIEW"
      ? `/admin/review/${paper.id}${next ? `?next=${next}` : ""}`
      : paper.studyPaper && isConfirmed
        ? `/studies/${paper.studyPaper.studyId}`
        : `/papers/${paper.id}`

  if (source === "openalex") {
    const ctx = await getBlitzContext()
    const hasKey = await userHasOpenAlexApiKey(ctx.session.userId as number)
    if (!hasKey) {
      return (
        <div>
          <a href={backHref} className="text-sm text-base-content/50 hover:text-base-content mb-6 inline-block">
            ← Back to article
          </a>
          <h1 className="text-2xl font-bold leading-snug mb-1">Add your OpenAlex API key first</h1>
          <p className="text-base-content/60 mb-4">
            Pulling from OpenAlex requires your own API key so calls spread across everyone's
            keys instead of one shared limit.
          </p>
          <Link href={"/admin/api-keys" as any} className="link">
            See how to get one
          </Link>
        </div>
      )
    }
  }

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
    keywords: paper.keywords.join(", "),
  }

  const initial: Record<FieldKey, string | number | boolean | null> = { ...current }
  for (const key of Object.keys(current) as FieldKey[]) {
    const fetchedValue = (fetched as any)[key]
    if (fetchedValue == null) continue
    initial[key] = key === "keywords" ? (fetchedValue as string[]).join(", ") : fetchedValue
  }

  const currentAuthors = paper.authors.map((pa) => ({
    id: pa.author.id,
    name: pa.author.name,
    orcid: pa.author.orcid,
    openalexAuthorId: pa.author.openalexAuthorId,
  }))
  // Fetched authorships don't carry our internal Author id — match by name
  // against the paper's current authors so a rename/enrichment doesn't
  // silently drop an already-linked ORCID/OpenAlex id.
  const initialAuthors = fetched.authors
    ? fetched.authors.map((fa) => {
        const match = currentAuthors.find(
          (ca) => ca.name.trim().toLowerCase() === fa.name.trim().toLowerCase()
        )
        return {
          id: match?.id ?? null,
          name: fa.name,
          orcid: fa.orcid ?? match?.orcid ?? null,
          openalexAuthorId: fa.openalexAuthorId ?? match?.openalexAuthorId ?? null,
        }
      })
    : currentAuthors

  return (
    <div>
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
        <PaperEditForm
          paperId={paper.id}
          source={source}
          initial={initial}
          initialAuthors={initialAuthors}
          backHref={backHref}
        />
      )}
    </div>
  )
}
