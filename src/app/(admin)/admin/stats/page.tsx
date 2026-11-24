import db from "db"
import { countLinkNeedsReviewGroups } from "src/lib/duplicateClusters"
import { NEEDS_ENRICH_WHERE } from "src/lib/needsEnrich"
import { workflowCounts } from "src/lib/workflow"

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

function SegmentedBar({
  segments,
}: {
  segments: { label: string; value: number; colorClass: string }[]
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  if (total === 0) return null
  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-base-300">
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div
              key={s.label}
              className={`${s.colorClass} h-full`}
              style={{ width: `${(s.value / total) * 100}%` }}
              title={`${s.label}: ${s.value} (${((s.value / total) * 100).toFixed(0)}%)`}
            />
          ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-base text-base-content/60">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${s.colorClass}`} />
            {s.label} ({s.value})
          </span>
        ))}
      </div>
    </div>
  )
}

export default async function AdminStatsPage() {
  const [
    statusCounts,
    studyPublicSizes,
    reviewCount,
    reportsCount,
    suggestionsCount,
    metadataCount,
    linkGroupCount,
    enrichCount,
    unverifiedCount,
    verifiedCount,
    groups,
  ] = await Promise.all([
    db.paper.groupBy({ by: ["status"], _count: true }),
    // How many public (approved or imported) items each study has, so the
    // study numbers match what visitors see rather than counting studies that
    // only hold pending or excluded items.
    db.study
      .findMany({ select: { papers: { select: { paper: { select: { status: true } } } } } })
      .then((studies) =>
        studies.map((st) => st.papers.filter((sp) => ["IMPORTED", "APPROVED"].includes(sp.paper.status)).length)
      ),
    db.paper.count({ where: { status: "PENDING_REVIEW" } }),
    db.paperReport.count({ where: { resolved: false } }),
    db.articleSuggestion.count({ where: { resolved: false } }),
    db.metadataEditSuggestion.count({ where: { resolved: false } }),
    countLinkNeedsReviewGroups(),
    db.paper.count({ where: NEEDS_ENRICH_WHERE }),
    db.paper.count({
      where: { canonicalPaperId: null, status: { in: ["IMPORTED", "APPROVED"] }, metadataVerifiedAt: null },
    }),
    db.paper.count({
      where: { canonicalPaperId: null, status: { in: ["IMPORTED", "APPROVED"] }, metadataVerifiedAt: { not: null } },
    }),
    workflowCounts(),
  ])

  const publicSizes = studyPublicSizes.filter((n) => n >= 1)
  const totalStudies = publicSizes.length
  // 2+ public items sharing a study: a real Stage 1/Stage 2 (or materials) group.
  const linkedStudies = publicSizes.filter((n) => n >= 2).length
  const soloStudyCount = publicSizes.filter((n) => n === 1).length
  const itemsInLinkedStudies = publicSizes.filter((n) => n >= 2).reduce((sum, n) => sum + n, 0)
  const totalPapers = statusCounts.reduce((sum, s) => sum + s._count, 0)
  const countFor = (status: string) => statusCounts.find((s) => s.status === status)?._count ?? 0

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Stats</h1>
      <p className="text-base text-base-content/60 mb-8">
        A snapshot of where the database stands: how many items are at each status, how much linking is left, and
        what is waiting in each part of the Admin menu. Click a card to open that page.
      </p>

      <div className="flex flex-col gap-8">
        <section>
          <h2 className="text-lg font-semibold mb-3">Items and studies</h2>
          <div className="stats stats-vertical sm:stats-horizontal shadow w-full flex-wrap bg-base-200 mb-4">
            <StatCard label="Items" value={totalPapers} hint="Every record in the database" />
            <StatCard label="Studies" value={totalStudies} hint="With at least one public item" />
            <StatCard label="Pending" value={countFor("PENDING_REVIEW")} hint="Waiting for a decision" />
            <StatCard
              label="Approved or imported"
              value={countFor("APPROVED") + countFor("IMPORTED")}
              hint="Public on the site"
            />
            <StatCard label="Excluded" value={countFor("REJECTED")} hint="Rejected as not a registered report" />
            <StatCard label="Duplicate" value={countFor("DUPLICATE")} hint="Copies of another item" />
          </div>
          <div className="mt-4 rounded-box bg-base-200 p-4 text-base">
            <p className="font-semibold mb-2">How the items break down</p>
            <p className="text-base-content/60 mb-3">
              A study is one registered report. It can hold several items (for example a Stage 1 article and a Stage 2
              article), so there are more public items than studies. Pending, excluded and duplicate items are not counted in studies.
            </p>
            <table className="table text-base">
              <thead>
                <tr className="text-base">
                  <th></th>
                  <th>Studies</th>
                  <th>Items</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Studies with one item</td>
                  <td>{soloStudyCount}</td>
                  <td>{soloStudyCount}</td>
                </tr>
                <tr>
                  <td>Linked studies (2 or more items)</td>
                  <td>{linkedStudies}</td>
                  <td>{itemsInLinkedStudies}</td>
                </tr>
                <tr className="font-semibold">
                  <td>Public (approved or imported)</td>
                  <td>{totalStudies}</td>
                  <td>{countFor("APPROVED") + countFor("IMPORTED")}</td>
                </tr>
                <tr>
                  <td>Pending</td>
                  <td>–</td>
                  <td>{countFor("PENDING_REVIEW")}</td>
                </tr>
                <tr>
                  <td>Excluded</td>
                  <td>–</td>
                  <td>{countFor("REJECTED")}</td>
                </tr>
                <tr>
                  <td>Duplicate</td>
                  <td>–</td>
                  <td>{countFor("DUPLICATE")}</td>
                </tr>
                <tr className="font-semibold">
                  <td>All items</td>
                  <td></td>
                  <td>{totalPapers}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-1">Work by group</h2>
          <p className="text-base text-base-content/60 mb-3">
            Groups of items taken through every step. A group is finished only when it is marked Done.
          </p>
          <div className="stats stats-vertical sm:stats-horizontal shadow w-full flex-wrap bg-base-200 mb-4">
            <StatCard label="Queue" value={groups.queue} hint="Not started" href="/admin/workflow" />
            <StatCard label="In progress" value={groups.IN_PROGRESS} hint="Approved, not marked" href="/admin/workflow?marker=IN_PROGRESS" />
            <StatCard label="Later" value={groups.LATER} href="/admin/workflow?marker=LATER" />
            <StatCard label="Question" value={groups.QUESTION} href="/admin/workflow?marker=QUESTION" />
            <StatCard label="Done" value={groups.DONE} href="/admin/workflow?marker=DONE" />
          </div>
          <SegmentedBar
            segments={[
              { label: "Queue", value: groups.queue, colorClass: "bg-primary" },
              { label: "In progress", value: groups.IN_PROGRESS, colorClass: "bg-secondary" },
              { label: "Later", value: groups.LATER, colorClass: "bg-warning" },
              { label: "Question", value: groups.QUESTION, colorClass: "bg-info" },
              { label: "Done", value: groups.DONE, colorClass: "bg-success" },
            ]}
          />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-1">Work by step</h2>
          <p className="text-base text-base-content/60 mb-3">
            What is still waiting in each step. These count items (Link counts groups), so they won't match the group
            numbers above.
          </p>
          <div className="stats stats-vertical sm:stats-horizontal shadow w-full flex-wrap bg-base-200 mb-4">
            <StatCard label="Review" value={reviewCount} hint="Pending items" href="/admin/review" />
            <StatCard label="Link" value={linkGroupCount} hint="Groups to link" href="/admin/link" />
            <StatCard label="Enrich" value={enrichCount} hint="Still to pull" href="/admin/enrich" />
            <StatCard label="Metadata" value={unverifiedCount} hint="Not yet verified" href="/admin/metadata-review" />
          </div>
          <SegmentedBar
            segments={[
              { label: "Metadata verified", value: verifiedCount, colorClass: "bg-success" },
              { label: "Not yet verified", value: unverifiedCount, colorClass: "bg-warning" },
            ]}
          />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-1">Fix issues</h2>
          <p className="text-base text-base-content/60 mb-3">Unresolved requests from users.</p>
          <div className="stats stats-vertical sm:stats-horizontal shadow w-full flex-wrap bg-base-200">
            <StatCard label="User reports" value={reportsCount} href="/admin/reports" />
            <StatCard label="Article suggestions" value={suggestionsCount} href="/admin/suggestions" />
            <StatCard label="Metadata fixes" value={metadataCount} href="/admin/metadata" />
          </div>
        </section>
      </div>
    </div>
  )
}
