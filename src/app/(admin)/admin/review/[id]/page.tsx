import { notFound } from "next/navigation"
import db from "db"
import { PaperActions } from "../PaperActions"
import { PaperFavoriteButton } from "../../../../components/PaperFavoriteButton"
import { PaperRecordSection } from "../../../../components/PaperRecordSection"
import { userHasOpenAlexApiKey } from "src/lib/apiKeyPool"
import { getBlitzContext } from "src/app/blitz-server"
import { resolveCitations } from "src/lib/resolveCitations"

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

  const ctx = await getBlitzContext()
  const userId = ctx.session.userId as number | undefined
  const hasOpenAlexApiKey = userId ? await userHasOpenAlexApiKey(userId) : false

  const paper = await db.paper.findUnique({
    where: { id: Number(id), status: "PENDING_REVIEW" },
    include: {
      authors: { include: { author: true }, orderBy: { position: "asc" } },
      extraction: {
        include: {
          codedBy: { select: { name: true, email: true } },
          verifiedBy: { select: { name: true, email: true } },
        },
      },
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

      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="text-3xl font-bold leading-snug">{paper.title}</h1>
        <div className="flex items-center gap-2 shrink-0 pt-1">
          <PaperFavoriteButton paperId={paper.id} initialFavorited={isFavorited} isLoggedIn={!!userId} />
        </div>
      </div>

      <div className="divide-y divide-base-200">
        <PaperRecordSection
          paper={paper}
          roleLabel="Record"
          citationData={citationData}
          isAdmin
          hasOpenAlexApiKey={hasOpenAlexApiKey}
          userId={userId}
          isReported={isReported}
          keywordBasePath="/admin/review"
          suggestEditHref={`/papers/${paper.id}/suggest-edit`}
          citationsDefaultOpen={false}
          reviewNext={nextParam}
        />
      </div>

      <div className="border-t border-base-200 mt-6 pt-8 text-center">
        <p className="text-base text-base-content/60 mb-3">Include this paper?</p>
        <PaperActions paperId={paper.id} nextHref={nextHref} />
      </div>
    </div>
  )
}
