import db from "db"
import { Pagination } from "../../../components/Pagination"
import { SearchAndKeywordFilter } from "../../../components/SearchAndKeywordFilter"
import { clusterPapersByTitle, isLinkEligible, LINK_ELIGIBLE_STATUSES } from "src/lib/duplicateClusters"
import { DuplicateGroupCard, type LinkablePaper } from "./DuplicateGroupCard"

const GROUPS_PER_PAGE = 20

const paperInclude = {
  authors: { include: { author: true }, orderBy: { position: "asc" as const } },
}

function toLinkable(
  paper: {
    id: number
    title: string
    year: number | null
    venue: string | null
    doi: string | null
    status: string
    authors: { author: { name: string } }[]
  },
  role: LinkablePaper["currentRole"]
): LinkablePaper {
  return {
    id: paper.id,
    title: paper.title,
    year: paper.year,
    venue: paper.venue,
    doi: paper.doi,
    status: paper.status,
    currentRole: role,
    authors: paper.authors,
  }
}

const ROLE_VALUES = new Set([
  "STAGE1_ARTICLE",
  "STAGE1_MATERIALS",
  "STAGE2_ARTICLE",
  "STAGE2_MATERIALS",
])

function groupNeedsReview(group: LinkablePaper[]): boolean {
  return !group.some((p) => p.currentRole && ROLE_VALUES.has(p.currentRole))
}

export default async function LinkDuplicatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; tab?: string }>
}) {
  const { q: qParam, page: pageParam, tab: tabParam } = await searchParams
  const q = qParam?.trim() || undefined
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)
  const tab = tabParam === "reviewed" ? "reviewed" : "needs-review"

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Link papers</h1>
      <p className="text-base text-base-content/60 mb-8">
        Papers with matching titles are grouped below automatically — probably the same
        registered report indexed more than once (a preprint, the published article, a
        registration link). Mark each one as Stage 1, Stage 2, materials, or a duplicate of
        another paper in the group to link them into one Study. Search for a specific paper to
        edit or unlink a study it's already part of, even if it wasn't grouped automatically.
      </p>

      <SearchAndKeywordFilter action="/admin/link" q={q} />

      {q ? <SearchResults q={q} /> : <AutoDetectedGroups page={page} tab={tab} />}
    </div>
  )
}

async function SearchResults({ q }: { q: string }) {
  const matches = await db.paper.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { doi: { contains: q, mode: "insensitive" } },
        { authors: { some: { author: { name: { contains: q, mode: "insensitive" } } } } },
      ],
    },
    select: { id: true, studyPaper: { select: { studyId: true } } },
  })

  if (matches.length === 0) {
    return <p className="text-base-content/40">No papers match "{q}".</p>
  }

  const studyIds = Array.from(
    new Set(matches.map((p) => p.studyPaper?.studyId).filter((id): id is number => id != null))
  )
  const soloPaperIds = matches.filter((p) => !p.studyPaper).map((p) => p.id)

  const [studies, soloPapers] = await Promise.all([
    db.study.findMany({
      where: { id: { in: studyIds } },
      include: { papers: { include: { paper: { include: paperInclude } } } },
    }),
    db.paper.findMany({ where: { id: { in: soloPaperIds } }, include: paperInclude }),
  ])

  const groups: LinkablePaper[][] = [
    ...studies.map((s) => s.papers.map((sp) => toLinkable(sp.paper, sp.role))),
    ...soloPapers.map((p) => [toLinkable(p, null)]),
  ]

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <DuplicateGroupCard key={group.map((p) => p.id).join("-")} papers={group} />
      ))}
    </div>
  )
}

async function AutoDetectedGroups({ page, tab }: { page: number; tab: "needs-review" | "reviewed" }) {
  const papers = await db.paper.findMany({
    where: { status: { in: [...LINK_ELIGIBLE_STATUSES] }, canonicalPaperId: null },
    include: {
      ...paperInclude,
      studyPaper: {
        select: { role: true, study: { select: { _count: { select: { papers: true } } } } },
      },
    },
    orderBy: { title: "asc" },
  })

  const eligible = papers.filter(isLinkEligible)
  const linkable = eligible.map((p) => toLinkable(p, p.studyPaper?.role ?? null))

  const allGroups = clusterPapersByTitle(linkable)
  const needsReviewGroups = allGroups.filter(groupNeedsReview)
  const reviewedGroups = allGroups.filter((g) => !groupNeedsReview(g))
  const groups = tab === "reviewed" ? reviewedGroups : needsReviewGroups

  const totalPages = Math.ceil(groups.length / GROUPS_PER_PAGE)
  const pageGroups = groups.slice((page - 1) * GROUPS_PER_PAGE, page * GROUPS_PER_PAGE)
  const buildHref = (p: number) => `/admin/link?tab=${tab}&page=${p}`

  return (
    <>
      <div className="tabs tabs-boxed w-fit mb-6">
        <a href="/admin/link?tab=needs-review" className={`tab ${tab === "needs-review" ? "tab-active" : ""}`}>
          Needs review ({needsReviewGroups.length})
        </a>
        <a href="/admin/link?tab=reviewed" className={`tab ${tab === "reviewed" ? "tab-active" : ""}`}>
          Already tagged ({reviewedGroups.length})
        </a>
      </div>

      {groups.length === 0 ? (
        <p className="text-base-content/40">
          {tab === "reviewed" ? "No already-tagged groups found." : "No duplicate-looking groups found."}
        </p>
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
    </>
  )
}
