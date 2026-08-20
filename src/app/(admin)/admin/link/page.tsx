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
  role: LinkablePaper["currentRole"],
  roleConfirmed: boolean
): LinkablePaper {
  return {
    id: paper.id,
    title: paper.title,
    year: paper.year,
    venue: paper.venue,
    doi: paper.doi,
    status: paper.status,
    currentRole: role,
    roleConfirmed,
    authors: paper.authors,
  }
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

// Builds groups from actual current Study membership rather than re-running
// title clustering — used once we already know which papers matter (a
// search hit, or a paper someone has acted on via this page), so it
// reflects the real, current link state even after papers have been fully
// merged into a shared multi-paper Study.
async function groupsForPaperIds(paperIds: number[]): Promise<LinkablePaper[][]> {
  if (paperIds.length === 0) return []

  const papers = await db.paper.findMany({
    where: { id: { in: paperIds } },
    select: { id: true, studyPaper: { select: { studyId: true } } },
  })

  const studyIds = Array.from(
    new Set(papers.map((p) => p.studyPaper?.studyId).filter((id): id is number => id != null))
  )
  const soloPaperIds = papers.filter((p) => !p.studyPaper).map((p) => p.id)

  const [studies, soloPapers] = await Promise.all([
    db.study.findMany({
      where: { id: { in: studyIds } },
      include: { papers: { include: { paper: { include: paperInclude } } } },
    }),
    db.paper.findMany({ where: { id: { in: soloPaperIds } }, include: paperInclude }),
  ])

  // A group's own members might include papers nobody has actually touched
  // yet (e.g. a sibling pulled in via shared Study membership), so look up
  // which of them really have a "link" edit history entry rather than
  // assuming every paper here counts as confirmed.
  const allPaperIds = [
    ...studies.flatMap((s) => s.papers.map((sp) => sp.paper.id)),
    ...soloPapers.map((p) => p.id),
  ]
  const touched = await db.paperEditHistory.findMany({
    where: { source: "link", paperId: { in: allPaperIds } },
    select: { paperId: true },
    distinct: ["paperId"],
  })
  const touchedIds = new Set(touched.map((t) => t.paperId))

  return [
    ...studies.map((s) =>
      s.papers.map((sp) => toLinkable(sp.paper, sp.role, touchedIds.has(sp.paper.id)))
    ),
    ...soloPapers.map((p) => [toLinkable(p, null, touchedIds.has(p.id))]),
  ]
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
    select: { id: true },
  })

  if (matches.length === 0) {
    return <p className="text-base-content/40">No papers match "{q}".</p>
  }

  const groups = await groupsForPaperIds(matches.map((p) => p.id))

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <DuplicateGroupCard key={group.map((p) => p.id).join("-")} papers={group} />
      ))}
    </div>
  )
}

async function AutoDetectedGroups({ page, tab }: { page: number; tab: "needs-review" | "reviewed" }) {
  const [eligiblePapers, touchedHistory] = await Promise.all([
    db.paper.findMany({
      where: { status: { in: [...LINK_ELIGIBLE_STATUSES] }, canonicalPaperId: null },
      include: {
        ...paperInclude,
        studyPaper: {
          select: { role: true, study: { select: { _count: { select: { papers: true } } } } },
        },
      },
      orderBy: { title: "asc" },
    }),
    // A paper only counts as "reviewed" once someone has actually acted on it
    // through this page — not just because it carries the "OTHER" fallback
    // role ~every paper already got from the old Zotero import, which would
    // otherwise make almost everything look reviewed. Looked up on every
    // paper ever touched here (not just still-eligible ones), since linking
    // a full pair moves both papers into a real multi-paper Study and drops
    // them out of the eligible/unlinked pool entirely.
    db.paperEditHistory.findMany({
      where: { source: "link" },
      select: { paperId: true },
      distinct: ["paperId"],
    }),
  ])

  const touchedIds = new Set(touchedHistory.map((h) => h.paperId))
  const eligible = eligiblePapers.filter(isLinkEligible).filter((p) => !touchedIds.has(p.id))
  // Every paper here was just filtered to exclude anything touched via this
  // page, so none of them have a confirmed role — any "OTHER" they carry is
  // just the untouched legacy fallback.
  const linkable = eligible.map((p) => toLinkable(p, p.studyPaper?.role ?? null, false))

  // minGroupSize 1 so untouched papers with no title match still show up as
  // their own single-paper card, with a way to link them manually.
  const needsReviewGroups = clusterPapersByTitle(linkable, 1)
  const reviewedGroups = await groupsForPaperIds(Array.from(touchedIds))
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
          {tab === "reviewed" ? "No already-tagged groups found." : "Nothing left to review."}
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
