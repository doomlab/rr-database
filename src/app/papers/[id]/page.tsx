import { notFound } from "next/navigation"
import { Navbar } from "../../components/Navbar"
import { PaperFavoriteButton } from "../../components/PaperFavoriteButton"
import { ReportButton } from "../../components/ReportButton"
import { getBlitzContext } from "../../blitz-server"
import db from "db"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const paper = await db.paper.findUnique({ where: { id: Number(id) }, select: { title: true } })
  return { title: paper ? `${paper.title} – RR Database` : "Paper – RR Database" }
}

export default async function PaperDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getBlitzContext()
  const userId = ctx.session.userId as number | undefined

  const paper = await db.paper.findUnique({
    where: { id: Number(id) },
    include: { authors: { include: { author: true }, orderBy: { position: "asc" } } },
  })

  if (!paper) notFound()

  const [isFavorited, isReported] = await Promise.all([
    userId
      ? db.paperFavorite.findUnique({ where: { userId_paperId: { userId, paperId: paper.id } } }).then(Boolean)
      : false,
    userId
      ? db.paperReport.findUnique({ where: { userId_paperId: { userId, paperId: paper.id } } }).then(Boolean)
      : false,
  ])

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <Navbar />

      <div className="w-full px-10 py-10">
        <div className="w-[90%] mx-auto">
          <a href="/excluded" className="text-sm text-base-content/50 hover:text-base-content mb-6 inline-block">
            ← Back to excluded
          </a>

          <div className="flex items-start justify-between gap-4 mb-2">
            <h1 className="text-3xl font-bold leading-snug">{paper.title}</h1>
            <div className="flex items-center gap-2 shrink-0 pt-1">
              <ReportButton paperId={paper.id} initialReported={isReported} isLoggedIn={!!userId} />
              <PaperFavoriteButton
                paperId={paper.id}
                initialFavorited={isFavorited}
                isLoggedIn={!!userId}
              />
            </div>
          </div>

          {paper.status === "REJECTED" && (
            <span className="badge badge-error mb-6">Excluded</span>
          )}

          <div className="flex flex-wrap items-start gap-2 mb-6">
            {paper.doi && (
              <a
                href={`https://doi.org/${paper.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-md text-base"
              >
                View article (DOI)
              </a>
            )}
            {paper.pdfUrl && (
              <a
                href={paper.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-md text-base"
              >
                {paper.openAccess ? "Open access PDF" : "View PDF"}
              </a>
            )}
          </div>

          <div className="space-y-1.5 text-base">
            {paper.authors.length > 0 && (
              <Row label="Authors" value={paper.authors.map((pa) => pa.author.name).join(", ")} />
            )}
            <Row label="Year" value={paper.year?.toString()} />
            <Row label="Venue" value={paper.venue ?? undefined} italic />
            <Row label="Publisher" value={paper.publisher ?? undefined} />
            <Row
              label="Volume / Issue"
              value={[paper.volume, paper.issue].filter(Boolean).join(" / ") || undefined}
            />
            <Row label="Pages" value={paper.pages ?? undefined} />
            <Row label="Item type" value={humanizeItemType(paper.itemType)} />
            {paper.abstract && (
              <div className="pt-2">
                <p className="text-base-content/70 leading-relaxed">{paper.abstract}</p>
              </div>
            )}
          </div>

          {paper.reviewNote && (
            <div className="mt-6 pt-4 border-t border-base-200">
              <p className="text-base text-base-content/60">
                <span className="font-medium">Reason excluded:</span> {paper.reviewNote}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function humanizeItemType(itemType: string | null): string | undefined {
  if (!itemType) return undefined
  const words = itemType
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
  return words.map((w) => w[0]!.toUpperCase() + w.slice(1)).join(" ")
}

function Row({ label, value, italic }: { label: string; value?: string; italic?: boolean }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-1.5">
      <span className="w-32 shrink-0 font-medium text-base-content/70">{label}</span>
      <span className={`text-base-content/80 ${italic ? "italic" : ""}`}>{value}</span>
    </div>
  )
}
