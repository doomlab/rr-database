import { getBlitzContext } from "src/app/blitz-server"
import { lastZoteroRun } from "src/lib/pipelineRuns"
import { WorkflowCard } from "../components/WorkflowCard"
import { RunCard } from "../components/RunCard"
import { RunImportButton } from "../components/RunImportButton"

export default async function AdminHomePage() {
  const ctx = await getBlitzContext()
  const isSuperAdmin = ctx.session.role === "SUPER_ADMIN"

  const [productionRun, stagingCollectionsRun] = isSuperAdmin
    ? await Promise.all([lastZoteroRun("[production]"), lastZoteroRun("[stagingCollections]")])
    : [null, null]

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-8">Admin</h1>

      <div className="flex flex-col gap-6">
        <WorkflowCard
          title="Add new papers & sync with production"
          description="Pull the latest items in from Zotero before doing anything else in a session. The production pull is safe to run any number of times; staging only needs to run once (or again if it needs to be redone). You don't need to stay on this page — check back and refresh to see the result."
        >
          {isSuperAdmin ? (
            <div className="flex flex-col gap-4">
              <RunCard
                title="Pull production Zotero library"
                description="Re-syncs every item in the production library as IMPORTED (already-confirmed) papers, including their manually-added tags, stage (from Stage 1/Stage 2 tags), notes, and Related-item links (auto-linked into Studies). Safe to re-run any time — with thousands of items, a full pull can take a while."
                run={productionRun}
                nested
              >
                <RunImportButton target="production" label="Pull from Zotero" />
              </RunCard>

              <RunCard
                title="Import staging library by review folder"
                description={
                  <>
                    One-time migration of the staging library's review folders: "1 – To Check" →
                    pending review, "2 – To Tag" → imported, "4 – Do Not Add" → rejected. Safe to
                    re-run if staging gets messed up — it's idempotent per Zotero item, so
                    re-running just re-applies the same mapping.
                  </>
                }
                run={stagingCollectionsRun}
                nested
              >
                <RunImportButton target="stagingCollections" label="Import staging collections" />
              </RunCard>
            </div>
          ) : (
            <p className="text-base text-base-content/40">
              Only super admins can run the Zotero sync.
            </p>
          )}
        </WorkflowCard>
      </div>
    </div>
  )
}
