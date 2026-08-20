import db from "db"
import { getBlitzContext } from "src/app/blitz-server"
import { lastZoteroRun, lastPipelineRun, openAlexYearRunHistory } from "src/lib/pipelineRuns"
import { userHasOpenAlexApiKey } from "src/lib/apiKeyPool"
import { countLinkNeedsReviewGroups } from "src/lib/duplicateClusters"
import { WorkflowCard } from "../components/WorkflowCard"
import { RunCard } from "../components/RunCard"
import { RunImportButton } from "../components/RunImportButton"
import { DiscoverOpenAlexYearButton } from "../components/DiscoverOpenAlexYearButton"
import { DiscoverOpenAlexRecentButton } from "../components/DiscoverOpenAlexRecentButton"
import { ScanOpenSciencePracticesButton } from "../components/ScanOpenSciencePracticesButton"

// Registered reports as a format only really got going around 2013.
const EARLIEST_RR_YEAR = 2013

export default async function AdminHomePage() {
  const ctx = await getBlitzContext()
  const userId = ctx.session.userId as number | undefined
  const isSuperAdmin = ctx.session.role === "SUPER_ADMIN"
  const hasOpenAlexApiKey = userId ? await userHasOpenAlexApiKey(userId) : false

  const currentYear = new Date().getFullYear()
  const years = Array.from(
    { length: currentYear - EARLIEST_RR_YEAR + 1 },
    (_, i) => currentYear - i
  )

  const [
    productionRun,
    stagingCollectionsRun,
    openAlexYearRun,
    openAlexRecentRun,
    yearRunHistory,
    reviewCount,
    linkGroupCount,
    openScienceScanRun,
    unscannedWithPdfCount,
  ] = await Promise.all([
    isSuperAdmin ? lastZoteroRun("[production]") : Promise.resolve(null),
    isSuperAdmin ? lastZoteroRun("[stagingCollections]") : Promise.resolve(null),
    lastPipelineRun("QUERY_OPENALEX", "[openalex:year:"),
    lastPipelineRun("QUERY_OPENALEX", "[openalex:recent]"),
    openAlexYearRunHistory(),
    db.paper.count({ where: { status: "PENDING_REVIEW", canonicalPaperId: null } }),
    countLinkNeedsReviewGroups(),
    lastPipelineRun("ENRICH", "[open-science-scan]"),
    db.paper.count({
      where: {
        pdfUrl: { not: null },
        openSciencePracticesScannedAt: null,
        status: { in: ["IMPORTED", "APPROVED"] },
      },
    }),
  ])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-8">Admin</h1>

      <div className="flex flex-col gap-6">
        <WorkflowCard
          title="Sync with production"
          description="Pull the latest data in from Zotero before doing anything else in a session. The production pull is safe to run any number of times; staging only needs to run once (or again if it needs to be redone). You don't need to stay on this page — check back and refresh to see the result."
        >
          {isSuperAdmin ? (
            <div className="flex flex-col gap-4">
              <RunCard
                title="Pull production Zotero library"
                description="Re-syncs every item in the production library as IMPORTED (already-confirmed) papers, including their manually-added tags, stage (from Stage 1/Stage 2 tags), notes, and Related-item links (auto-linked into Studies). Safe to re-run any time — it only fills in fields that are still blank and adds any new tags, so it won't undo enrichment or edits already made in the app. With thousands of items, a full pull can take a while."
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
                    re-run if staging gets messed up — running it again just re-applies the same
                    folder mapping and fills in whatever's still blank, without undoing anything
                    already filled in.
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

        <WorkflowCard
          title="Add new papers"
          description="Search external sources for new registered reports and bring candidates into the database as Pending review. Anything already in the database (matched by DOI or OpenAlex ID) is skipped automatically, so these are always safe to re-run. We're building this out one search at a time."
        >
          {hasOpenAlexApiKey ? (
            <div className="flex flex-col gap-4">
              <RunCard
                title="Pull a specific year"
                description={`Searches OpenAlex for works matching "registered report", "preregistered report", "pre-registered report", or "preregistered research" published in the chosen year. Useful for a one-off backfill of an older year.`}
                run={openAlexYearRun}
                nested
              >
                <DiscoverOpenAlexYearButton years={years} runHistory={yearRunHistory} />
              </RunCard>

              <RunCard
                title="Pull the last two years"
                description="Runs the same search across the last two years, to catch anything newly indexed or backdated by OpenAlex since the last time this ran. This is the one to run routinely."
                run={openAlexRecentRun}
                nested
              >
                <DiscoverOpenAlexRecentButton />
              </RunCard>
            </div>
          ) : (
            <div className="tooltip" data-tip="Add an OpenAlex key on your Account page to enable searching">
              <button type="button" className="btn btn-accent btn-sm text-base" disabled>
                Search OpenAlex
              </button>
            </div>
          )}
        </WorkflowCard>

        <WorkflowCard
          title="Review candidates"
          description="Go through papers that have been discovered or imported but not yet confirmed — approve them into the database or reject them. Each one shows its full details and lets you pull fresh data from OpenAlex or Crossref before you decide."
          badge={reviewCount}
        >
          <a href="/admin/review" className="btn btn-primary btn-sm text-base">
            Go to review queue
          </a>
        </WorkflowCard>

        <WorkflowCard
          title="Link papers"
          description="Papers with matching titles get grouped together — usually the same registered report indexed more than once (a preprint, the published article, a registration link). Mark each one as Stage 1, Stage 2, materials, or a duplicate to link them into a single Study. You can also search for a paper directly to edit or unlink a study it's already part of."
          badge={linkGroupCount}
        >
          <a href="/admin/link" className="btn btn-primary btn-sm text-base">
            Go to link papers
          </a>
        </WorkflowCard>

        <WorkflowCard
          title="Detect open science practices"
          description="Scans the PDF text of confirmed papers for links near data/code/materials-availability language, and preregistration links if one isn't already on file. Only ever fills in blank fields — never overwrites a link you or another source already found. Safe to re-run; it only looks at papers it hasn't scanned yet."
          badge={unscannedWithPdfCount}
        >
          <RunCard
            title="Scan for data, code, materials, and preregistration links"
            description="Looks at every confirmed paper with a PDF that hasn't been scanned yet. Detection is a simple keyword/link search, not exhaustive — treat results as a starting point, not a guarantee."
            run={openScienceScanRun}
            nested
          >
            <ScanOpenSciencePracticesButton />
          </RunCard>
        </WorkflowCard>
      </div>
    </div>
  )
}
