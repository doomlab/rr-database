import { notFound } from "next/navigation"
import { Navbar } from "../../components/Navbar"
import { BackLink } from "../../components/BackLink"
import { AddStudyItem } from "../../components/AddStudyItem"
import { PaperFavoriteButton } from "../../components/PaperFavoriteButton"
import { PaperRecordSection } from "../../components/PaperRecordSection"
import { userHasOpenAlexApiKey } from "src/lib/apiKeyPool"
import { getBlitzContext } from "../../blitz-server"
import { resolveCitations } from "src/lib/resolveCitations"
import db from "db"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const paper = await db.paper.findUnique({ where: { id: Number(id) }, select: { title: true } })
  return { title: paper ? `${paper.title} – RR Database` : "Item – RR Database" }
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
      studyPaper: { select: { studyId: true, role: true } },
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
  const backHref = keywordBasePath

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <Navbar />

      <div className="w-full px-10 py-10">
        <div className="w-[90%] mx-auto">
          <BackLink fallbackHref={backHref}>← Back</BackLink>

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

          {(paper.status === "REJECTED" || paper.studyPaper || isAdmin) && (
            <div className="flex flex-wrap items-center gap-2 mb-8">
              <span className="badge badge-neutral">Single item page</span>
              {paper.status === "REJECTED" && <span className="badge badge-error">Excluded</span>}
              {paper.studyPaper && (paper.status === "IMPORTED" || paper.status === "APPROVED") && (
                <a
                  href={`/studies/${paper.studyPaper.studyId}?paper=${paper.id}`}
                  className="btn btn-secondary btn-sm text-base"
                >
                  This item is part of a study — view the whole study
                </a>
              )}
              {isAdmin && !paper.studyPaper && paper.status !== "REJECTED" && (
                <span className="badge badge-warning">Not in a study yet</span>
              )}
            </div>
          )}

          <div className="divide-y divide-base-200">
            <PaperRecordSection
              paper={paper}
              roleLabel="Record"
              adminStudyActions={
                isAdmin && paper.status !== "REJECTED" ? (
                  <AddStudyItem
                    studyId={paper.studyPaper?.studyId}
                    anchor={{
                      paperId: paper.id,
                      role:
                        paper.studyPaper?.role ??
                        (paper.stage === "STAGE_2" ? "STAGE2_ARTICLE" : paper.stage === "STAGE_1" ? "STAGE1_ARTICLE" : "OTHER"),
                    }}
                    defaultRole={paper.stage === "STAGE_1" ? "STAGE2_ARTICLE" : "STAGE1_ARTICLE"}
                  />
                ) : undefined
              }
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
