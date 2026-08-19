import { redirect } from "next/navigation"
import { Navbar } from "../components/Navbar"
import { FavoriteButton } from "../components/FavoriteButton"
import { Pagination } from "../components/Pagination"
import { getBlitzContext } from "../blitz-server"
import db from "db"

const PAGE_SIZE = 50

function primaryPaper(papers: { role: string; paper: any }[]) {
  return (
    papers.find((p) => p.role === "STAGE2_ARTICLE")?.paper ??
    papers.find((p) => p.role === "STAGE1_ARTICLE")?.paper ??
    papers[0]?.paper
  )
}

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const ctx = await getBlitzContext()
  const userId = ctx.session.userId as number | undefined
  if (!userId) redirect("/login")

  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const [favorites, totalFavorites] = await Promise.all([
    db.studyFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        study: {
          include: {
            papers: {
              where: { paper: { status: { in: ["IMPORTED", "APPROVED"] } } },
              include: {
                paper: {
                  include: { authors: { include: { author: true }, orderBy: { position: "asc" } } },
                },
              },
            },
          },
        },
      },
    }),
    db.studyFavorite.count({ where: { userId } }),
  ])

  const totalPages = Math.ceil(totalFavorites / PAGE_SIZE)
  const buildHref = (p: number) => `/favorites?page=${p}`

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <Navbar />

      <div className="flex-1 w-full px-10 py-8">
        <div className="w-[90%] mx-auto">
          <h1 className="text-2xl font-semibold mb-1">My Favorites</h1>
          <p className="text-base-content/60 mb-8">{totalFavorites} saved</p>

          {favorites.length === 0 ? (
            <div className="text-center py-16 text-base-content/40">
              <p className="text-lg">No favorites yet.</p>
              <a href="/" className="link link-primary text-sm mt-2 inline-block">
                Browse registered reports
              </a>
            </div>
          ) : (
            <>
              <ul className="flex flex-col divide-y divide-base-200">
                {favorites.map((fav) => {
                  const paper = primaryPaper(fav.study.papers)
                  if (!paper) return null
                  return (
                    <li
                      key={fav.id}
                      className="py-5 hover:bg-base-200/40 px-3 -mx-3 rounded-lg transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h2 className="font-semibold text-base leading-snug mb-1">{paper.title}</h2>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/50">
                            {paper.authors.length > 0 && (
                              <>
                                <span>{paper.authors.map((pa: any) => pa.author.name).join(", ")}</span>
                                <span>·</span>
                              </>
                            )}
                            {paper.year && <span>{paper.year}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <FavoriteButton studyId={fav.study.id} initialFavorited={true} />
                          <a href={`/studies/${fav.study.id}`} className="btn btn-primary btn-sm">
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
