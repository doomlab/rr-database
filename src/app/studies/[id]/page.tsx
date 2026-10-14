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
import { InfoTip } from "../../components/InfoTip"
import { StudyTitleEditor } from "../../components/StudyTitleEditor"


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

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <Navbar />

      <div className="w-full px-10 py-10">
        <div className="w-[90%] mx-auto">
          <a href="/" className="text-sm text-base-content/50 hover:text-base-content mb-6 inline-block">
            ← Back to browse
          </a>

          <div className="flex items-start justify-between gap-4 mb-8">
            {isAdmin ? (
              <StudyTitleEditor
                studyId={study.id}
                title={studyTitle(study)}
                hasCustomTitle={!!study.title?.trim()}
              />
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

          {(study.registrationUrl || study.biasLevel || !hasStage1 || isProgrammatic) && (
            <div className="flex flex-wrap gap-2 mb-8">
              {study.registrationUrl && (
                <a
                  href={study.registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  View registration{study.registrationPlatform ? ` (${study.registrationPlatform})` : ""}
                </a>
              )}
              {study.biasLevel && <span className="badge badge-info">{study.biasLevel}</span>}
              {!hasStage1 && <span className="badge badge-warning">No Stage 1 found</span>}
              {isProgrammatic && (
                <span className="badge badge-secondary">Programmatic ({stage2Count} Stage 2 manuscripts)</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">
              {study.papers.length} item{study.papers.length === 1 ? "" : "s"} in this study
            </h2>
            <InfoTip
              label="What are items?"
              text="Items are the individual outputs that make up a study: the Stage 1 and Stage 2 articles, any preprints, supplemental materials (code, data or materials in a repository such as an OSF project), and any Peer Community In Registered Reports recommendation, reviews, author responses and decisions. Each item has its own tab and its own details."
            />
          </div>

          {study.papers.length > 1 ? (
            <div className="tabs">
              {study.papers.map(({ paper, role }, idx) => (
                <Fragment key={paper.id}>
                  <input
                    type="radio"
                    name={`study-${study.id}-tabs`}
                    className="tab text-base font-medium"
                    aria-label={STUDY_PAPER_ROLE_LABELS[role] ?? role}
                    defaultChecked={
                      study.papers.some((sp) => sp.paper.id === Number(activePaper))
                        ? paper.id === Number(activePaper)
                        : idx === 0
                    }
                  />
                  <div className="tab-content">
                    <PaperRecordSection
                      paper={paper}
                      roleLabel={STUDY_PAPER_ROLE_LABELS[role] ?? role}
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
            </div>
          ) : (
            <div className="divide-y divide-base-200">
              {study.papers.map(({ paper, role }) => (
                <PaperRecordSection
                  key={paper.id}
                  paper={paper}
                  roleLabel={STUDY_PAPER_ROLE_LABELS[role] ?? role}
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
