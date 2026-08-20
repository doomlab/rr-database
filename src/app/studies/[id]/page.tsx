import { notFound } from "next/navigation"
import { Navbar } from "../../components/Navbar"
import { FavoriteButton } from "../../components/FavoriteButton"
import { PaperRecordSection } from "../../components/PaperRecordSection"
import { userHasOpenAlexApiKey } from "src/lib/apiKeyPool"
import { getBlitzContext } from "../../blitz-server"
import { resolveCitations } from "src/lib/resolveCitations"
import db from "db"

const ROLE_LABELS: Record<string, string> = {
  STAGE1_ARTICLE: "Stage 1 article",
  STAGE1_MATERIALS: "Stage 1 materials",
  STAGE2_ARTICLE: "Stage 2 article",
  STAGE2_MATERIALS: "Stage 2 materials",
  OTHER: "Record",
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const study = await db.study.findUnique({
    where: { id: Number(id) },
    include: { papers: { include: { paper: { select: { title: true } } } } },
  })
  const title = study?.papers[0]?.paper.title
  return { title: title ? `${title} – RR Database` : "Registered Report – RR Database" }
}

export default async function StudyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  const headlinePaper = study.papers[0]?.paper

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <Navbar />

      <div className="w-full px-10 py-10">
        <div className="w-[90%] mx-auto">
          <a href="/" className="text-sm text-base-content/50 hover:text-base-content mb-6 inline-block">
            ← Back to browse
          </a>

          <div className="flex items-start justify-between gap-4 mb-8">
            <h1 className="text-3xl font-bold leading-snug">{headlinePaper?.title}</h1>
            <div className="flex items-center gap-2 shrink-0 pt-1">
              <FavoriteButton
                studyId={study.id}
                initialFavorited={isFavorited}
                isLoggedIn={!!userId}
              />
            </div>
          </div>

          {(study.registrationUrl || study.biasLevel) && (
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
            </div>
          )}

          <div className="divide-y divide-base-200">
            {study.papers.map(({ paper, role }) => (
              <PaperRecordSection
                key={paper.id}
                paper={paper}
                roleLabel={ROLE_LABELS[role] ?? role}
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
        </div>
      </div>
    </div>
  )
}
