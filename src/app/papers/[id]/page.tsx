import { notFound } from "next/navigation"
import { Navbar } from "../../components/Navbar"
import { PaperFavoriteButton } from "../../components/PaperFavoriteButton"
import { PaperRecordSection } from "../../components/PaperRecordSection"
import { userHasOpenAlexApiKey } from "src/lib/apiKeyPool"
import { getBlitzContext } from "../../blitz-server"
import { resolveCitations } from "src/lib/resolveCitations"
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
  const isAdmin = ctx.session.role === "ADMIN" || ctx.session.role === "SUPER_ADMIN"
  const hasOpenAlexApiKey = isAdmin && userId ? await userHasOpenAlexApiKey(userId) : false

  const paper = await db.paper.findUnique({
    where: { id: Number(id) },
    include: {
      authors: { include: { author: true }, orderBy: { position: "asc" } },
      citationsFrom: { orderBy: { year: "desc" } },
      editHistory: {
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
      metadataVerifiedBy: { select: { name: true, email: true } },
    },
  })

  if (!paper) notFound()

  const [citationData, isFavorited, isReported] = await Promise.all([
    resolveCitations(paper),
    userId
      ? db.paperFavorite.findUnique({ where: { userId_paperId: { userId, paperId: paper.id } } }).then(Boolean)
      : false,
    userId
      ? db.paperReport.findUnique({ where: { userId_paperId: { userId, paperId: paper.id } } }).then(Boolean)
      : false,
  ])

  const keywordBasePath = paper.status === "REJECTED" ? "/excluded" : "/"

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
              <PaperFavoriteButton
                paperId={paper.id}
                initialFavorited={isFavorited}
                isLoggedIn={!!userId}
              />
            </div>
          </div>

          {paper.status === "REJECTED" && (
            <div className="flex flex-wrap gap-2 mb-8">
              <span className="badge badge-error">Excluded</span>
            </div>
          )}

          <div className="divide-y divide-base-200">
            <PaperRecordSection
              paper={paper}
              roleLabel="Record"
              citationData={citationData}
              isAdmin={isAdmin}
              hasOpenAlexApiKey={hasOpenAlexApiKey}
              userId={userId}
              isReported={isReported}
              keywordBasePath={keywordBasePath}
              suggestEditHref={
                userId
                  ? `/papers/${paper.id}/suggest-edit`
                  : `/login?next=/papers/${paper.id}/suggest-edit`
              }
            />
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
