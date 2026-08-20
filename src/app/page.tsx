import { Navbar } from "./components/Navbar"
import { FavoriteButton } from "./components/FavoriteButton"
import { ReportButton } from "./components/ReportButton"
import { Pagination } from "./components/Pagination"
import { getBlitzContext } from "./blitz-server"
import db, { PaperStatus } from "db"

const PAGE_SIZE = 50

function primaryPaper(papers: { role: string; paper: any }[]) {
  return (
    papers.find((p) => p.role === "STAGE2_ARTICLE")?.paper ??
    papers.find((p) => p.role === "STAGE1_ARTICLE")?.paper ??
    papers[0]?.paper
  )
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const q = params.q?.trim() || undefined
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const ctx = await getBlitzContext()
  const userId = ctx.session.userId as number | undefined

  const CONFIRMED_STATUSES: PaperStatus[] = [PaperStatus.IMPORTED, PaperStatus.APPROVED]

  const studyWhere = {
    papers: { some: { paper: { status: { in: CONFIRMED_STATUSES } } } },
    ...(q
      ? {
          AND: [
            {
              papers: {
                some: {
                  paper: {
                    status: { in: CONFIRMED_STATUSES },
                    OR: [
                      { title: { contains: q, mode: "insensitive" as const } },
                      { abstract: { contains: q, mode: "insensitive" as const } },
                      { doi: { contains: q, mode: "insensitive" as const } },
                    ],
                  },
                },
              },
            },
          ],
        }
      : {}),
  }

  const [studies, totalStudies, favoritedIds, reportedIds] = await Promise.all([
    db.study.findMany({
      where: studyWhere,
      include: {
        papers: {
          where: { paper: { status: { in: CONFIRMED_STATUSES } } },
          include: {
            paper: {
              include: { authors: { include: { author: true }, orderBy: { position: "asc" } } },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    db.study.count({ where: studyWhere }),
    userId
      ? db.studyFavorite
          .findMany({ where: { userId }, select: { studyId: true } })
          .then((rows) => new Set(rows.map((r) => r.studyId)))
      : Promise.resolve(new Set<number>()),
    userId
      ? db.paperReport
          .findMany({ where: { userId }, select: { paperId: true } })
          .then((rows) => new Set(rows.map((r) => r.paperId)))
      : Promise.resolve(new Set<number>()),
  ])

  const totalPages = Math.ceil(totalStudies / PAGE_SIZE)
  const buildHref = (p: number) => {
    const sp = new URLSearchParams()
    if (q) sp.set("q", q)
    sp.set("page", String(p))
    return `/?${sp.toString()}`
  }

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <Navbar />

      <div className="flex-1 w-full px-10 py-8">
        <div className="w-[90%] mx-auto">
          <form className="mb-6" action="/" method="get">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search title, abstract, or DOI..."
              className="input input-bordered w-full"
            />
          </form>

          <div className="flex items-center justify-between mb-5">
            <p className="text-base text-base-content/60">
              <span className="font-semibold text-base-content">{totalStudies}</span> registered
              report{totalStudies === 1 ? "" : "s"}
            </p>
            <a
              href={userId ? "/suggest-article" : "/login?next=/suggest-article"}
              className="btn btn-warning btn-sm"
            >
              Can't find a paper? Suggest one
            </a>
          </div>

          {studies.length === 0 ? (
            <div className="text-center py-16 text-base-content/40">
              <p className="text-lg">No results match your search.</p>
              <a href="/" className="link link-primary text-sm mt-2 inline-block">
                Clear search
              </a>
            </div>
          ) : (
            <>
              <ul className="flex flex-col divide-y divide-base-200">
                {studies.map((study) => {
                  const paper = primaryPaper(study.papers)
                  if (!paper) return null
                  const hasBothStages = study.papers.length > 1
                  return (
                    <li
                      key={study.id}
                      className="py-5 hover:bg-base-200/40 px-3 -mx-3 rounded-lg transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h2 className="font-semibold text-base leading-snug">{paper.title}</h2>
                            {hasBothStages && (
                              <span className="badge badge-primary badge-sm shrink-0">
                                stage 1 + 2
                              </span>
                            )}
                          </div>
                          {paper.abstract && (
                            <p className="text-base text-base-content/60 mb-2 line-clamp-2">
                              {paper.abstract}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/50">
                            {paper.authors.length > 0 && (
                              <>
                                <span>
                                  {paper.authors.map((pa: any) => pa.author.name).join(", ")}
                                </span>
                                <span>·</span>
                              </>
                            )}
                            {paper.year && <span>{paper.year}</span>}
                            {paper.venue && (
                              <>
                                <span>·</span>
                                <span className="italic">{paper.venue}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <ReportButton
                            paperId={paper.id}
                            initialReported={reportedIds.has(paper.id)}
                            isLoggedIn={!!userId}
                          />
                          <FavoriteButton
                            studyId={study.id}
                            initialFavorited={favoritedIds.has(study.id)}
                            isLoggedIn={!!userId}
                          />
                          <a href={`/studies/${study.id}`} className="btn btn-primary btn-sm">
                            View
                          </a>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
