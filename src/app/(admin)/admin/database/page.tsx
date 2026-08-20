import { redirect } from "next/navigation"
import db from "db"
import { getBlitzContext } from "src/app/blitz-server"
import { RunImportButton } from "../../components/RunImportButton"

export const metadata = { title: "Database – Admin" }

async function lastRun(prefix: string) {
  return db.pipelineRun.findFirst({
    where: { step: "PULL_ZOTERO", output: { startsWith: prefix } },
    orderBy: { createdAt: "desc" },
    include: { startedBy: { select: { name: true, email: true } } },
  })
}

export default async function DatabasePage() {
  const ctx = await getBlitzContext()
  if (ctx.session.role !== "SUPER_ADMIN") redirect("/admin")

  const [productionRun, stagingCollectionsRun] = await Promise.all([
    lastRun("[production]"),
    lastRun("[stagingCollections]"),
  ])

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-1">Database</h1>
      <p className="text-base-content/60 mb-8">
        Pull data in from Zotero. The production pull is safe to run any number of times —
        staging should only need to run once, unless it needs to be redone. Staying on this page
        isn't required; check back and refresh to see the result.
      </p>

      <div className="flex flex-col gap-6">
        <RunCard
          title="Pull production Zotero library"
          description="Re-syncs every item in the production library as IMPORTED (already-confirmed) papers, including their manually-added tags, stage (from Stage 1/Stage 2 tags), notes, and Related-item links (auto-linked into Studies). Safe to re-run any time — with thousands of items, a full pull can take a while."
          run={productionRun}
        >
          <RunImportButton target="production" label="Pull from Zotero" />
        </RunCard>

        <RunCard
          title="Import staging library by review folder"
          description={
            <>
              One-time migration of the staging library's review folders: "1 – To Check" →
              pending review, "2 – To Tag" → imported, "4 – Do Not Add" → rejected. Safe to
              re-run if staging gets messed up — it's idempotent per Zotero item, so re-running
              just re-applies the same mapping. See{" "}
              <code>pipeline/import_staging_collections.py</code> for the same logic run from
              the CLI.
            </>
          }
          run={stagingCollectionsRun}
        >
          <RunImportButton target="stagingCollections" label="Import staging collections" />
        </RunCard>
      </div>
    </div>
  )
}

function RunCard({
  title,
  description,
  run,
  children,
}: {
  title: string
  description: React.ReactNode
  run: Awaited<ReturnType<typeof lastRun>>
  children: React.ReactNode
}) {
  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-base-content/60">{description}</p>
        </div>

        {run ? (
          <div className="text-xs text-base-content/50">
            Last run {run.createdAt.toLocaleString()} by {run.startedBy?.name ?? run.startedBy?.email ?? "unknown"}
            {" — "}
            <span
              className={
                run.status === "DONE"
                  ? "text-success"
                  : run.status === "FAILED"
                    ? "text-error"
                    : "text-warning"
              }
            >
              {run.status}
            </span>
            {run.output && <p className="mt-1">{run.output}</p>}
          </div>
        ) : (
          <p className="text-xs text-base-content/40">Never run.</p>
        )}

        {children}
      </div>
    </div>
  )
}
