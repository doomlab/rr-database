import { redirect } from "next/navigation"
import { getBlitzContext } from "src/app/blitz-server"
import { lastZoteroRun } from "src/lib/pipelineRuns"
import { RunImportButton } from "../../components/RunImportButton"
import { RunCard } from "../../components/RunCard"

export const metadata = { title: "Database – Admin" }

export default async function DatabasePage() {
  const ctx = await getBlitzContext()
  if (ctx.session.role !== "SUPER_ADMIN") redirect("/admin")

  const [productionRun, stagingCollectionsRun] = await Promise.all([
    lastZoteroRun("[production]"),
    lastZoteroRun("[stagingCollections]"),
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
          description="Re-syncs every item in the production library as IMPORTED (already-confirmed) papers, including their manually-added tags, stage (from Stage 1/Stage 2 tags), notes, and Related-item links (auto-linked into Studies). Safe to re-run any time — it only fills in fields that are still blank and adds any new tags, so it won't undo enrichment or edits already made in the app. With thousands of items, a full pull can take a while."
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
              re-run if staging gets messed up — running it again just re-applies the same folder
              mapping and fills in whatever's still blank, without undoing anything already
              filled in. See{" "}
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
