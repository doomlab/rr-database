import db from "db"
import { redirect } from "next/navigation"
import { loadWorkflowGroup, nextWorkflowSeedId, workflowCounts, type WorkflowView } from "src/lib/workflow"
import { WorkflowSteps } from "./WorkflowSteps"
import { MARKER_LABELS, type GroupPaper, type Marker } from "./types"

const VIEWS = ["IN_PROGRESS", "LATER", "QUESTION", "DONE"] as const
const VIEW_LABELS = { IN_PROGRESS: "In progress", ...MARKER_LABELS } as const

export const metadata = { title: "One group at a time – Admin" }

export default async function WorkflowPage({
  searchParams,
}: {
  searchParams: Promise<{ g?: string; marker?: string }>
}) {
  const params = await searchParams
  const filter: WorkflowView | undefined = VIEWS.find((v) => v === params.marker)
  const queueHref = `/admin/workflow${filter ? `?marker=${filter}` : ""}`

  const counts = await workflowCounts()

  const header = (
    <>
      <h1 className="text-2xl font-semibold mb-1">One group at a time</h1>
      <p className="text-base text-base-content/60 mb-4">
        Take one group of papers all the way through: review, link, enrich, and verify metadata.
      </p>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {(
          [
            { key: null, label: "Queue", count: counts.queue, color: "btn-primary" },
            { key: "IN_PROGRESS", label: VIEW_LABELS.IN_PROGRESS, count: counts.IN_PROGRESS, color: "btn-secondary" },
            { key: "LATER", label: MARKER_LABELS.LATER, count: counts.LATER, color: "btn-warning" },
            { key: "QUESTION", label: MARKER_LABELS.QUESTION, count: counts.QUESTION, color: "btn-info" },
            { key: "DONE", label: MARKER_LABELS.DONE, count: counts.DONE, color: "btn-success" },
          ] as const
        ).map((chip) => (
          <a
            key={chip.label}
            href={chip.key ? `/admin/workflow?marker=${chip.key}` : "/admin/workflow"}
            className={`btn btn-sm text-base ${chip.color} ${(filter ?? null) === chip.key ? "ring-2 ring-base-content ring-offset-2 ring-offset-base-100" : ""}`}
          >
            {chip.label} ({chip.count})
          </a>
        ))}
      </div>
    </>
  )

  const seedParam = Number(params.g)
  if (!seedParam) {
    const next = await nextWorkflowSeedId(filter)
    if (next) redirect(`/admin/workflow?g=${next}${filter ? `&marker=${filter}` : ""}`)
    return (
      <div>
        {header}
        <p className="text-lg text-base-content/40 text-center py-16">
          {filter === "IN_PROGRESS"
            ? "Nothing in progress — no approved papers are waiting to be finished."
            : filter
              ? `Nothing marked ${MARKER_LABELS[filter]}.`
              : "The queue is empty — no papers are awaiting review."}
        </p>
      </div>
    )
  }

  const group = await loadWorkflowGroup(seedParam)
  if (!group || group.length === 0) {
    return (
      <div>
        {header}
        <p className="text-base text-error">Paper #{seedParam} wasn't found.</p>
        <a href={queueHref} className="link link-primary text-base">Back to the queue</a>
      </div>
    )
  }

  const crossrefPulls = await db.paperEditHistory.groupBy({
    by: ["paperId"],
    where: { paperId: { in: group.map((p) => p.id) }, source: "crossref" },
    _max: { createdAt: true },
  })
  const crossrefPulledAt = new Map(crossrefPulls.map((r) => [r.paperId, r._max.createdAt]))

  const seed = group.find((p) => p.id === seedParam) ?? group[0]!
  const papers: GroupPaper[] = group.map((p) => ({
    id: p.id,
    title: p.title,
    year: p.year,
    venue: p.venue,
    doi: p.doi,
    url: p.url,
    status: p.status,
    stage: p.stage,
    authors: p.authors.map((pa) => pa.author.name),
    studyId: p.studyPaper?.studyId ?? null,
    role: p.studyPaper?.role ?? null,
    pcirrRole: (p.pcirrMetadata as { role?: string } | null)?.role ?? null,
    openAlexFetchedAt: p.openAlexFetchedAt?.toISOString() ?? null,
    crossrefQueried: p.crossrefQueried,
    crossrefFound: p.crossrefFound,
    crossrefPulledAt: crossrefPulledAt.get(p.id)?.toISOString() ?? null,
    metadataVerifiedAt: p.metadataVerifiedAt?.toISOString() ?? null,
  }))

  return (
    <div>
      {header}
      <div className="mb-6">
        <h2 className="text-xl font-semibold leading-snug">{seed.title}</h2>
        <p className="text-base text-base-content/60 mt-1">
          {group.length} paper{group.length === 1 ? "" : "s"} in this group
          {seed.workflowMarker && seed.workflowMarkedBy
            ? ` · marked ${MARKER_LABELS[seed.workflowMarker]} by ${seed.workflowMarkedBy.name ?? seed.workflowMarkedBy.email}`
            : ""}
        </p>
        {seed.workflowNote && <p className="text-base mt-2 rounded-lg bg-base-200 p-3">{seed.workflowNote}</p>}
      </div>
      <WorkflowSteps
        key={seed.id}
        papers={papers}
        marker={(seed.workflowMarker as Marker | null) ?? null}
        note={seed.workflowNote}
        queueHref={queueHref}
      />
    </div>
  )
}
