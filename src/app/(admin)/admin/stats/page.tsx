import db from "db"
import { countLinkNeedsReviewGroups } from "src/lib/duplicateClusters"

function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string
  value: number | string
  hint?: string
  href?: string
}) {
  const content = (
    <>
      <div className="stat-title text-base">{label}</div>
      <div className="stat-value text-3xl">{value}</div>
      {hint && <div className="stat-desc text-base">{hint}</div>}
    </>
  )
  return href ? (
    <a href={href} className="stat bg-base-200 rounded-box hover:bg-base-300 transition-colors">
      {content}
    </a>
  ) : (
    <div className="stat bg-base-200 rounded-box">{content}</div>
  )
}

export default async function AdminStatsPage() {
  const [
    statusCounts,
    totalStudies,
    linkedStudies,
    reviewCount,
    reportsCount,
    suggestionsCount,
    metadataCount,
    linkGroupCount,
  ] = await Promise.all([
    db.paper.groupBy({ by: ["status"], _count: true }),
    db.study.count(),
    // Studies with 2+ papers linked — a real Stage 1/Stage 2 (or
    // materials/PCI RR) group, not a leftover solo study.
    db.study
      .findMany({ select: { _count: { select: { papers: true } } } })
      .then((sizes) => sizes.filter((s) => s._count.papers >= 2).length),
    db.paper.count({ where: { status: "PENDING_REVIEW" } }),
    db.paperReport.count({ where: { resolved: false } }),
    db.articleSuggestion.count({ where: { resolved: false } }),
    db.metadataEditSuggestion.count({ where: { resolved: false } }),
    countLinkNeedsReviewGroups(),
  ])

  const totalPapers = statusCounts.reduce((sum, s) => sum + s._count, 0)
  const countFor = (status: string) => statusCounts.find((s) => s.status === status)?._count ?? 0

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Stats</h1>
      <p className="text-base text-base-content/60 mb-8">
        A snapshot of where the database stands — how many papers are at each stage, how much
        Stage 1/Stage 2 linking is left, and what's waiting in each admin queue.
      </p>

      <div className="flex flex-col gap-8">
        <section>
          <h2 className="text-lg font-semibold mb-3">Papers by status</h2>
          <div className="stats stats-vertical sm:stats-horizontal shadow w-full flex-wrap bg-base-200">
            <StatCard label="Total papers" value={totalPapers} />
            <StatCard label="Imported" value={countFor("IMPORTED")} hint="From production Zotero" />
            <StatCard label="Pending review" value={countFor("PENDING_REVIEW")} />
            <StatCard label="Approved" value={countFor("APPROVED")} hint="Approved via review queue" />
            <StatCard label="Rejected" value={countFor("REJECTED")} hint="Excluded" />
            <StatCard label="Duplicate" value={countFor("DUPLICATE")} />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Study linking</h2>
          <div className="stats stats-vertical sm:stats-horizontal shadow w-full flex-wrap bg-base-200">
            <StatCard label="Total studies" value={totalStudies} />
            <StatCard
              label="Actually linked"
              value={linkedStudies}
              hint="2+ papers sharing a Study"
            />
            <StatCard
              label="Solo studies"
              value={totalStudies - linkedStudies}
              hint="Leftover from the old import, or genuinely not yet paired"
            />
            <StatCard
              label="Duplicate groups left"
              value={linkGroupCount}
              hint="Title-matched, not yet linked"
            />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Admin queues</h2>
          <div className="stats stats-vertical sm:stats-horizontal shadow w-full flex-wrap bg-base-200">
            <StatCard label="Review queue" value={reviewCount} />
            <StatCard label="Link groups" value={linkGroupCount} />
            <StatCard label="User reports" value={reportsCount} />
            <StatCard label="Article suggestions" value={suggestionsCount} />
            <StatCard label="Metadata edits" value={metadataCount} href="/admin/metadata" />
          </div>
        </section>
      </div>
    </div>
  )
}
