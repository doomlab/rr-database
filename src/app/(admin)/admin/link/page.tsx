import db from "db"
import { Pagination } from "../../../components/Pagination"
import { clusterPapersByTitle } from "src/lib/duplicateClusters"
import { DuplicateGroupCard } from "./DuplicateGroupCard"

const GROUPS_PER_PAGE = 20

export default async function LinkDuplicatesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)

  const papers = await db.paper.findMany({
    where: {
      status: { in: ["PENDING_REVIEW", "IMPORTED", "APPROVED"] },
      canonicalPaperId: null,
      studyPaper: null,
    },
    include: { authors: { include: { author: true }, orderBy: { position: "asc" } } },
    orderBy: { title: "asc" },
  })

  const groups = clusterPapersByTitle(papers)
  const totalPages = Math.ceil(groups.length / GROUPS_PER_PAGE)
  const pageGroups = groups.slice((page - 1) * GROUPS_PER_PAGE, page * GROUPS_PER_PAGE)
  const buildHref = (p: number) => `/admin/link?page=${p}`

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Link duplicates</h1>
      <p className="text-base text-base-content/60 mb-8">
        Papers with matching titles, grouped together — probably the same registered report
        indexed more than once (a preprint, the published article, a registration link). Mark
        each one as Stage 1, Stage 2, materials, or a duplicate of another paper in the group.
        Assigning any role links the whole group into one Study; marking a paper a duplicate
        removes it from the database views and points it at the paper it duplicates.
      </p>

      {groups.length === 0 ? (
        <p className="text-base-content/40">No duplicate-looking groups found.</p>
      ) : (
        <>
          <div className="flex flex-col gap-6">
            {pageGroups.map((group) => (
              <DuplicateGroupCard key={group.map((p) => p.id).join("-")} papers={group} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
        </>
      )}
    </div>
  )
}
