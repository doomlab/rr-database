import { notFound, redirect } from "next/navigation"
import { Navbar } from "../../components/Navbar"
import { BackLink } from "../../components/BackLink"
import { AddStudyItem } from "../../components/AddStudyItem"
import { RestorePaperButtons } from "../../components/ReviewActions"
import { PaperFavoriteButton } from "../../components/PaperFavoriteButton"
import { PaperRecordSection } from "../../components/PaperRecordSection"
import { userHasOpenAlexApiKey } from "src/lib/apiKeyPool"
import { getBlitzContext } from "../../blitz-server"
import { resolveCitations } from "src/lib/resolveCitations"
import db from "db"
import { STUDY_PAPER_ROLE_LABELS } from "src/lib/studyPaperRoles"

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

  // One place to look at anything in a study: its study page, opened on this
  // item's tab. Only for public items — a pending or excluded item inside a
  // study isn't shown there, so it keeps this page.
  if (paper.studyPaper && (paper.status === "IMPORTED" || paper.status === "APPROVED")) {
    redirect(`/studies/${paper.studyPaper.studyId}?paper=${paper.id}`)
  }

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

  // Same look as a study page: a tab strip with this item as its single tab.
  const tabLabel =
    (paper.studyPaper && STUDY_PAPER_ROLE_LABELS[paper.studyPaper.role]) ||
    (paper.stage === "STAGE_1" ? "Stage 1 article" : paper.stage === "STAGE_2" ? "Stage 2 article" : "Item")

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

          <div className="flex flex-wrap items-center gap-2 mb-6">
            {paper.status === "REJECTED" ? (
              <span className="badge badge-error">Excluded</span>
            ) : paper.status === "IMPORTED" || paper.status === "APPROVED" ? (
              isAdmin && <span className="badge badge-warning">Not in a study yet</span>
            ) : paper.status === "DUPLICATE" ? (
              <span className="badge badge-neutral">Duplicate</span>
            ) : (
              <span className="badge badge-warning">Pending review</span>
            )}
          </div>

          <div className="tabs gap-2 [&>.tab]:h-11 [&>.tab]:px-5 [&>.tab]:rounded-lg [&>.tab]:bg-base-300 [&>.tab]:text-base-content [&>.tab]:font-semibold [&>.tab]:shadow-md [&>.tab:checked]:bg-primary [&>.tab:checked]:text-primary-content [&>.tab:checked]:shadow-lg">
            <input type="radio" name="item-tab" className="tab text-base" aria-label={tabLabel} defaultChecked />
            <div className="tab-content border-0 border-t-2 border-base-content/30 rounded-none mt-4 p-0">
          <div className="divide-y divide-base-200">
            <PaperRecordSection
              paper={paper}
              roleLabel={tabLabel}
              showRoleLabel={false}
              adminStudyActions={
                isAdmin && (paper.status === "REJECTED" || paper.status === "DUPLICATE") ? (
                  <RestorePaperButtons paperId={paper.id} />
                ) : isAdmin ? (
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
            </div>
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
