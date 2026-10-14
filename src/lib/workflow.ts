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

// Highest relevance score first, matching the review queue's ordering.
const QUEUE_ORDER = [{ modelScore: "desc" }, { createdAt: "desc" }] satisfies Prisma.PaperOrderByWithRelationInput[]

export async function nextWorkflowSeedId(marker?: WorkflowMarker): Promise<number | null> {
  const seed = await db.paper.findFirst({
    where: marker ? { workflowMarker: marker, canonicalPaperId: null } : QUEUE_WHERE,
    orderBy: marker ? { workflowMarkedAt: "asc" } : QUEUE_ORDER,
    select: { id: true },
  })
  return seed?.id ?? null
}

// Marker is set on every paper in a group together, so count groups rather
// than papers: papers sharing a Study are one group, the rest cluster by title.
function countGroups(papers: { id: number; title: string; studyPaper: { studyId: number } | null }[]) {
  const studyIds = new Set(papers.flatMap((p) => (p.studyPaper ? [p.studyPaper.studyId] : [])))
  const unlinked = papers.filter((p) => !p.studyPaper)
  return studyIds.size + clusterPapersByTitle(unlinked, 1).length
}

export async function workflowCounts() {
  const [queuePapers, markedPapers] = await Promise.all([
    db.paper.findMany({ where: QUEUE_WHERE, select: { id: true, title: true } }),
    db.paper.findMany({
      where: { workflowMarker: { not: null }, canonicalPaperId: null },
      select: { id: true, title: true, workflowMarker: true, studyPaper: { select: { studyId: true } } },
    }),
  ])
  const markerCount = (m: WorkflowMarker) => countGroups(markedPapers.filter((p) => p.workflowMarker === m))
  const queue = clusterPapersByTitle(queuePapers, 1).length
  const counts = { queue, LATER: markerCount("LATER"), QUESTION: markerCount("QUESTION"), DONE: markerCount("DONE") }
  // Everything that still needs someone's attention: not yet touched, or
  // parked for later / with a question. Only "Done" is finished.
  return { ...counts, notDone: counts.queue + counts.LATER + counts.QUESTION }
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
