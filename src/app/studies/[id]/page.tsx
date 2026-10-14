import { Fragment } from "react"
import { notFound } from "next/navigation"
import { Navbar } from "../../components/Navbar"
import { FavoriteButton } from "../../components/FavoriteButton"
import { PaperRecordSection } from "../../components/PaperRecordSection"
import { userHasOpenAlexApiKey } from "src/lib/apiKeyPool"
import { getBlitzContext } from "../../blitz-server"
import { resolveCitations } from "src/lib/resolveCitations"
import db from "db"
import { studyTitle } from "src/lib/studyTitle"
import { STUDY_PAPER_ROLE_LABELS } from "src/lib/studyPaperRoles"
import { ButtonTip } from "../../components/ButtonTip"
import { InfoTip } from "../../components/InfoTip"
import { StudyTitleProvider, StudyTitle, EditTitleButton } from "../../components/StudyTitleEditor"


export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const study = await db.study.findUnique({
    where: { id: Number(id) },
    include: { papers: { include: { paper: { select: { title: true } } }, orderBy: { role: "asc" } } },
  })
  const title = study ? studyTitle(study) : null
  return { title: title ? `${title} – RR Database` : "Registered Report – RR Database" }
}

export default async function StudyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ paper?: string }>
}) {
  const { id } = await params
  const { paper: activePaper } = await searchParams
  const ctx = await getBlitzContext()
  const userId = ctx.session.userId as number | undefined
  const isAdmin = ctx.session.role === "ADMIN" || ctx.session.role === "SUPER_ADMIN"
  const hasOpenAlexApiKey = isAdmin && userId ? await userHasOpenAlexApiKey(userId) : false

  const study = await db.study.findUnique({
    where: { id: Number(id) },
    include: {
      papers: {
        where: { paper: { status: { in: ["IMPORTED", "APPROVED"] } } },
        include: {
          paper: {
            include: {
              authors: { include: { author: true }, orderBy: { position: "asc" } },
              citationsFrom: { orderBy: { year: "desc" } },
              editHistory: {
                include: { user: { select: { name: true, email: true } } },
                orderBy: { createdAt: "desc" },
              },
              metadataVerifiedBy: { select: { name: true, email: true } },
            },
          },
        },
        orderBy: { role: "asc" },
      },
    },
  })

  if (!study || study.papers.length === 0) notFound()

  const citationDataByPaperId = new Map(
    await Promise.all(
      study.papers.map(async ({ paper }) => [paper.id, await resolveCitations(paper)] as const)
    )
  )

  const [isFavorited, reportedIds] = await Promise.all([
    userId
      ? db.studyFavorite
          .findUnique({ where: { userId_studyId: { userId, studyId: study.id } } })
          .then(Boolean)
      : false,
    userId
      ? db.paperReport
          .findMany({ where: { userId }, select: { paperId: true } })
          .then((rows) => new Set(rows.map((r) => r.paperId)))
      : Promise.resolve(new Set<number>()),
  ])

  const hasStage1 = study.papers.some(({ role }) => role === "STAGE1_ARTICLE")
  const stage2Count = study.papers.filter(({ role }) => role === "STAGE2_ARTICLE").length
  const isProgrammatic = stage2Count > 1
  const hasCustomTitle = !!study.title?.trim()

  const page = (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <Navbar />

      <div className="w-full px-10 py-10">
        <div className="w-[90%] mx-auto">
          <a href="/" className="text-sm text-base-content/50 hover:text-base-content mb-6 inline-block">
            ← Back to browse
          </a>

          <div className="flex items-start justify-between gap-4 mb-3">
            {isAdmin ? (
              <StudyTitle />
            ) : (
              <h1 className="text-3xl font-bold leading-snug">{studyTitle(study)}</h1>
            )}
            <div className="flex items-center gap-2 shrink-0 pt-1">
              <FavoriteButton
                studyId={study.id}
                initialFavorited={isFavorited}
                isLoggedIn={!!userId}
              />
            </div>
          </div>

          {(study.biasLevel || !hasStage1 || isProgrammatic || (isAdmin && hasCustomTitle)) && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {study.biasLevel && <span className="badge badge-info">{study.biasLevel}</span>}
              {!hasStage1 && <span className="badge badge-warning">No Stage 1 found</span>}
              {isProgrammatic && (
                <span className="badge badge-secondary">Programmatic ({stage2Count} Stage 2 manuscripts)</span>
              )}
              {isAdmin && hasCustomTitle && <span className="badge badge-info">custom title</span>}
            </div>
          )}

          <div className="tabs gap-2 [&>.tab]:h-11 [&>.tab]:px-5 [&>.tab]:rounded-lg [&>.tab]:bg-base-300 [&>.tab]:text-base-content [&>.tab]:font-semibold [&>.tab]:shadow-md [&>.tab]:hover:bg-base-content/25 [&>.tab:checked]:bg-primary [&>.tab:checked]:text-primary-content [&>.tab:checked]:shadow-lg">
            {study.papers.map(({ paper, role }, idx) => (
              <Fragment key={paper.id}>
                <input
                  type="radio"
                  name={`study-${study.id}-tabs`}
                  className="tab text-base"
                  aria-label={STUDY_PAPER_ROLE_LABELS[role] ?? role}
                  defaultChecked={
                    study.papers.some((sp) => sp.paper.id === Number(activePaper))
                      ? paper.id === Number(activePaper)
                      : idx === 0
                  }
                />
                <div className="tab-content border-0 border-t-2 border-base-content/30 rounded-none mt-4 p-0">
                  <PaperRecordSection
                    paper={paper}
                    roleLabel={STUDY_PAPER_ROLE_LABELS[role] ?? role}
                    showRoleLabel={false}
                    adminStudyActions={isAdmin ? <EditTitleButton /> : undefined}
                    studyActions={
                      <>
                        {study.registrationUrl && study.registrationUrl !== paper.registrationUrl && (
                          <ButtonTip tip="Open the preregistration for the whole study">
                            <a
                              href={study.registrationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary btn-md text-base"
                            >
                              Study registration
                              {study.registrationPlatform ? ` (${study.registrationPlatform})` : ""}
                            </a>
                          </ButtonTip>
                        )}
                      </>
                    }
                    citationData={citationDataByPaperId.get(paper.id)!}
                    isAdmin={isAdmin}
                    hasOpenAlexApiKey={hasOpenAlexApiKey}
                    userId={userId}
                    isReported={reportedIds.has(paper.id)}
                    keywordBasePath="/"
                    suggestEditHref={
                      userId
                        ? `/papers/${paper.id}/suggest-edit`
                        : `/login?next=/papers/${paper.id}/suggest-edit`
                    }
                  />
                </div>
              </Fragment>
            ))}
            <span className="self-center pl-3">
              <InfoTip
                small
                label="What are these tabs?"
                text="Each tab is one item that makes up this study: the Stage 1 and Stage 2 articles, any preprints, supplemental materials (code, data or materials in a repository such as an OSF project), and any Peer Community In Registered Reports recommendation, reviews, author responses and decisions. Click a tab to see that item's details."
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  return isAdmin ? (
    <StudyTitleProvider studyId={study.id} title={studyTitle(study)} hasCustomTitle={hasCustomTitle}>
      {page}
    </StudyTitleProvider>
  ) : (
    page
  )
}
