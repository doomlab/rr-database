import db, { Prisma, WorkflowMarker } from "db"
import { clusterPapersByTitle } from "./duplicateClusters"

// The one-group-at-a-time workflow. A "group" starts as a title cluster of
// papers awaiting review and, once those papers are linked, is the Study they
// share — so a group is always: the seed paper, its Study-mates, and any
// still-pending papers whose titles cluster with it.

// What the workflow needs to show a paper: enough to judge it, set its role,
// and see where it is in the pipeline.
export const workflowPaperInclude = {
  authors: { include: { author: true }, orderBy: { position: "asc" } },
  studyPaper: { select: { studyId: true, role: true } },
  metadataVerifiedBy: { select: { name: true, email: true } },
  workflowMarkedBy: { select: { name: true, email: true } },
} satisfies Prisma.PaperInclude

export type WorkflowPaper = Prisma.PaperGetPayload<{ include: typeof workflowPaperInclude }>

const QUEUE_WHERE = {
  status: "PENDING_REVIEW",
  canonicalPaperId: null,
  workflowMarker: null,
} satisfies Prisma.PaperWhereInput

// Approved through the workflow (or the Review page) but not yet marked — the
// ones someone has started on. Legacy imported papers are IMPORTED, not
// APPROVED, so they don't show up here.
const IN_PROGRESS_WHERE = {
  status: "APPROVED",
  canonicalPaperId: null,
  workflowMarker: null,
} satisfies Prisma.PaperWhereInput

export type WorkflowView = "IN_PROGRESS" | WorkflowMarker

// Highest relevance score first, matching the review queue's ordering.
const QUEUE_ORDER = [{ modelScore: "desc" }, { createdAt: "desc" }] satisfies Prisma.PaperOrderByWithRelationInput[]

function viewQuery(view?: WorkflowView) {
  const where: Prisma.PaperWhereInput =
    view === "IN_PROGRESS" ? IN_PROGRESS_WHERE : view ? { workflowMarker: view, canonicalPaperId: null } : QUEUE_WHERE
  const orderBy: Prisma.PaperOrderByWithRelationInput[] =
    view === "IN_PROGRESS" ? [{ reviewedAt: "asc" }] : view ? [{ workflowMarkedAt: "asc" }] : QUEUE_ORDER
  return { where, orderBy }
}

export async function nextWorkflowSeedId(view?: WorkflowView): Promise<number | null> {
  const seed = await db.paper.findFirst({ ...viewQuery(view), select: { id: true } })
  return seed?.id ?? null
}

// Marker is set on every paper in a group together, so list groups rather
// than papers: papers sharing a Study are one group, the rest cluster by
// title. Groups keep the order of their first paper.
function groupPapers<T extends { id: number; title: string; studyPaper: { studyId: number } | null }>(
  papers: T[]
): T[][] {
  const byStudy = new Map<number, T[]>()
  const unlinked: T[] = []
  for (const p of papers) {
    if (p.studyPaper) byStudy.set(p.studyPaper.studyId, [...(byStudy.get(p.studyPaper.studyId) ?? []), p])
    else unlinked.push(p)
  }
  const position = new Map(papers.map((p, i) => [p.id, i]))
  return [...byStudy.values(), ...clusterPapersByTitle(unlinked, 1)].sort(
    (a, b) => Math.min(...a.map((p) => position.get(p.id)!)) - Math.min(...b.map((p) => position.get(p.id)!))
  )
}

const countGroups = (papers: Parameters<typeof groupPapers>[0]) => groupPapers(papers).length

export type WorkflowGroupRow = {
  seedId: number
  title: string
  paperCount: number
  year: number | null
  authors: string[]
  modelScore: number | null
  markedBy: string | null
  markedAt: Date | null
  note: string | null
}

export async function listWorkflowGroups(view?: WorkflowView, limit = 200) {
  const papers = await db.paper.findMany({
    ...viewQuery(view),
    select: {
      id: true,
      title: true,
      year: true,
      modelScore: true,
      workflowNote: true,
      workflowMarkedAt: true,
      workflowMarkedBy: { select: { name: true, email: true } },
      studyPaper: { select: { studyId: true } },
      authors: { select: { author: { select: { name: true } } }, orderBy: { position: "asc" }, take: 3 },
    },
  })
  const groups = groupPapers(papers)
  const rows: WorkflowGroupRow[] = groups.slice(0, limit).map((g) => {
    const seed = g[0]!
    return {
      seedId: seed.id,
      title: seed.title,
      paperCount: g.length,
      year: seed.year,
      authors: seed.authors.map((a) => a.author.name),
      modelScore: seed.modelScore,
      markedBy: seed.workflowMarkedBy ? (seed.workflowMarkedBy.name ?? seed.workflowMarkedBy.email) : null,
      markedAt: seed.workflowMarkedAt,
      note: seed.workflowNote,
    }
  })
  return { rows, total: groups.length }
}

export async function workflowCounts() {
  const [queuePapers, inProgressPapers, markedPapers] = await Promise.all([
    db.paper.findMany({ where: QUEUE_WHERE, select: { id: true, title: true } }),
    db.paper.findMany({
      where: IN_PROGRESS_WHERE,
      select: { id: true, title: true, studyPaper: { select: { studyId: true } } },
    }),
    db.paper.findMany({
      where: { workflowMarker: { not: null }, canonicalPaperId: null },
      select: { id: true, title: true, workflowMarker: true, studyPaper: { select: { studyId: true } } },
    }),
  ])
  const markerCount = (m: WorkflowMarker) => countGroups(markedPapers.filter((p) => p.workflowMarker === m))
  const queue = clusterPapersByTitle(queuePapers, 1).length
  const counts = { queue, IN_PROGRESS: countGroups(inProgressPapers), LATER: markerCount("LATER"), QUESTION: markerCount("QUESTION"), DONE: markerCount("DONE") }
  // Everything that still needs someone's attention: not yet touched, or
  // parked for later / with a question. Only "Done" is finished.
  return { ...counts, notDone: counts.queue + counts.IN_PROGRESS + counts.LATER + counts.QUESTION }
}

export async function loadWorkflowGroup(seedId: number): Promise<WorkflowPaper[] | null> {
  const seed = await db.paper.findUnique({
    where: { id: seedId },
    select: { id: true, title: true, studyPaper: { select: { studyId: true } } },
  })
  if (!seed) return null

  const pending = await db.paper.findMany({
    where: { status: "PENDING_REVIEW", canonicalPaperId: null, id: { not: seed.id } },
    select: { id: true, title: true },
  })
  const clusterIds = clusterPapersByTitle([seed, ...pending], 1)
    .find((g) => g.some((p) => p.id === seed.id))!
    .map((p) => p.id)

  // Anything in a Study with a cluster member is part of the group too.
  const studyIds = (
    await db.studyPaper.findMany({
      where: { paperId: { in: clusterIds } },
      select: { studyId: true },
    })
  ).map((sp) => sp.studyId)

  return db.paper.findMany({
    where: {
      OR: [{ id: { in: clusterIds } }, { studyPaper: { studyId: { in: studyIds } } }],
    },
    include: workflowPaperInclude,
    orderBy: [{ year: "asc" }, { id: "asc" }],
  })
}
