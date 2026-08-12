import { notFound } from "next/navigation"
import db from "db"
import { PaperActions } from "../PaperActions"
import { EnrichButton } from "../../../components/EnrichButton"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const paper = await db.paper.findUnique({ where: { id: Number(id) }, select: { title: true } })
  return { title: paper ? `${paper.title} – Review` : "Review – Admin" }
}

export default async function ReviewDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ next?: string }>
}) {
  const { id } = await params
  const { next: nextParam } = await searchParams

  const paper = await db.paper.findUnique({
    where: { id: Number(id), status: "PENDING_REVIEW" },
    include: { authors: { include: { author: true }, orderBy: { position: "asc" } } },
  })

  if (!paper) notFound()

  const [nextFirst, ...restNext] = nextParam?.split(",").filter(Boolean) ?? []
  const nextHref = nextFirst
    ? `/admin/review/${nextFirst}${restNext.length ? `?next=${restNext.join(",")}` : ""}`
    : "/admin/review"

  return (
    <div>
      <a
        href="/admin/review"
        className="text-sm text-base-content/50 hover:text-base-content mb-6 inline-block"
      >
        ← Back to queue
      </a>

      <h1 className="text-2xl font-bold leading-snug mb-6">{paper.title}</h1>

      <div className="flex flex-wrap items-center gap-2 mb-8">
        {paper.doi && (
          <a
            href={`https://doi.org/${paper.doi}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline btn-sm"
          >
            View DOI
          </a>
        )}
        {paper.pdfUrl && (
          <a href={paper.pdfUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
            View PDF
          </a>
        )}
        {paper.url && (
          <a href={paper.url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
            View source
          </a>
        )}
        {paper.registrationUrl && (
          <a
            href={paper.registrationUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline btn-sm"
          >
            View registration{paper.registrationPlatform ? ` (${paper.registrationPlatform})` : ""}
          </a>
        )}
        <EnrichButton paperId={paper.id} />
        {paper.openAlexFetchedAt && (
          <span className="text-xs text-base-content/40">
            OpenAlex checked {paper.openAlexFetchedAt.toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="divide-y divide-base-200 text-sm mb-10">
        <Section title="Publication">
          <Row
            label="Authors"
            value={paper.authors.map((pa) => pa.author.name).join(", ") || undefined}
          />
          <Row label="Year" value={paper.year?.toString()} />
          <Row label="Venue" value={paper.venue ?? undefined} italic />
          <Row label="DOI" value={paper.doi ?? undefined} />
          <Row label="Publisher" value={paper.publisher ?? undefined} />
          <Row label="Item type" value={paper.itemType ?? undefined} />
          <Row label="Stage" value={paper.stage ?? undefined} />
          <Row label="Bias level" value={paper.biasLevel ?? undefined} />
        </Section>

        {paper.abstract && (
          <Section title="Abstract">
            <p className="text-base-content/70 leading-relaxed">{paper.abstract}</p>
          </Section>
        )}
      </div>

      <div className="border-t border-base-200 pt-8 text-center">
        <p className="text-sm text-base-content/60 mb-3">Include this paper?</p>
        <PaperActions paperId={paper.id} nextHref={nextHref} />
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-base-content/40 mb-3">
        {title}
      </h2>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function Row({ label, value, italic }: { label: string; value?: string; italic?: boolean }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-1.5">
      <span className="w-36 shrink-0 font-medium text-base-content/70">{label}</span>
      <span className={`text-base-content/80 ${italic ? "italic" : ""}`}>{value}</span>
    </div>
  )
}
