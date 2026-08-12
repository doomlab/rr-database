import { notFound } from "next/navigation"
import { Navbar } from "../../components/Navbar"
import { FavoriteButton } from "../../components/FavoriteButton"
import { ReportButton } from "../../components/ReportButton"
import { getBlitzContext } from "../../blitz-server"
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

  const study = await db.study.findUnique({
    where: { id: Number(id) },
    include: {
      papers: {
        where: { paper: { status: { in: ["IMPORTED", "APPROVED"] } } },
        include: {
          paper: {
            include: {
              authors: { include: { author: true }, orderBy: { position: "asc" } },
              extraction: true,
            },
          },
        },
        orderBy: { role: "asc" },
      },
    },
  })

  if (!study || study.papers.length === 0) notFound()

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
        <div className="max-w-3xl mx-auto">
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
              <div key={paper.id} className="py-6">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-base-content/40">
                    {ROLE_LABELS[role] ?? role}
                  </h2>
                  <ReportButton
                    paperId={paper.id}
                    initialReported={reportedIds.has(paper.id)}
                    isLoggedIn={!!userId}
                  />
                </div>

                <div className="space-y-1.5 text-base">
                  {paper.authors.length > 0 && (
                    <Row
                      label="Authors"
                      value={paper.authors.map((pa) => pa.author.name).join(", ")}
                    />
                  )}
                  <Row label="Year" value={paper.year?.toString()} />
                  <Row label="Venue" value={paper.venue ?? undefined} italic />
                  {paper.doi && (
                    <div className="flex gap-3 py-1.5">
                      <span className="w-32 shrink-0 font-medium text-base-content/70">DOI</span>
                      <a
                        href={`https://doi.org/${paper.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link link-primary break-all"
                      >
                        {paper.doi}
                      </a>
                    </div>
                  )}
                  {paper.abstract && (
                    <div className="pt-2">
                      <p className="text-base-content/70 leading-relaxed">{paper.abstract}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
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
