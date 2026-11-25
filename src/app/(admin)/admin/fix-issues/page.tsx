import db from "db"
import { getBlitzContext } from "src/app/blitz-server"
import { lastPipelineRun } from "src/lib/pipelineRuns"
import { userHasOpenAlexApiKey } from "src/lib/apiKeyPool"
import { LinkCard } from "../../components/LinkCard"
import { RunCard } from "../../components/RunCard"
import { RunAuthorMetaBackfillButton } from "../../components/RunAuthorMetaBackfillButton"
import { CleanTitleEntitiesButton } from "../../components/CleanTitleEntitiesButton"
import { RejectRemovedFromZoteroButton } from "../../components/RejectRemovedFromZoteroButton"

export const metadata = { title: "Fix issues – Admin" }

export default async function FixIssuesPage() {
  const ctx = await getBlitzContext()
  const userId = ctx.session.userId as number | undefined
  const isSuperAdmin = ctx.session.role === "SUPER_ADMIN"
  const hasOpenAlexApiKey = userId ? await userHasOpenAlexApiKey(userId) : false

  const [reportsCount, suggestionsCount, metadataEditCount, authorMetaBackfillRun] = await Promise.all([
    db.paperReport.count({ where: { resolved: false } }),
    db.articleSuggestion.count({ where: { resolved: false } }),
    db.metadataEditSuggestion.count({ where: { resolved: false } }),
    lastPipelineRun("ENRICH", "[author-meta-backfill]"),
  ])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Fix issues</h1>
      <p className="text-base text-base-content/60 mb-8">
        Problems people have reported, and tools for cleaning up the data itself. Each request clears when you resolve or
        dismiss it.
      </p>

      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold">Requests from users</h2>
          <p className="text-base text-base-content/60">Reports, suggestions and corrections that people have sent in.</p>
        </div>

        <LinkCard
          title="User reports"
          description="Items users have reported as not being registered reports, or as having a problem. Look at each one and resolve or dismiss it."
          badge={reportsCount}
          href="/admin/reports"
          label="Go to user reports"
        />

        <LinkCard
          title="Article suggestions"
          description="Items users have suggested that aren't in the database yet. Review each one, correct anything before adding, and it flows straight into the review queue — or dismiss it without adding."
          badge={suggestionsCount}
          href="/admin/suggestions"
          label="Go to article suggestions"
        />

        <LinkCard
          title="Metadata fixes"
          description="Corrections users have suggested on an item's own page — wrong journal, garbled author names, missing links, etc. Review the whole record before applying, or dismiss the suggestion."
          badge={metadataEditCount}
          href="/admin/metadata"
          label="Go to metadata fixes"
        />

        <div className="mt-4">
          <h2 className="text-xl font-semibold">Clean up the data</h2>
          <p className="text-base text-base-content/60">One-off tools for fixing the records themselves.</p>
        </div>

        <CleanTitleEntitiesButton
          title="Clean up HTML in titles"
          description={"Some titles came in with HTML codes such as &nbsp; or &amp; showing as text. This finds them and fixes the wording, and new imports are already cleaned. Preview shows what would change before anything is saved."}
        />

        {isSuperAdmin && (
          <RejectRemovedFromZoteroButton
            title="Exclude items removed from Zotero"
            description="The Zotero pull only adds and updates, so items deleted from Zotero stay on the site. This lists the items that came from the library but are no longer in it. Confirming marks them Excluded (not deleted), so any of them can be restored from the Excluded list. Run it after the library has been cleaned up, then pull again."
          />
        )}

        <RunCard
          title="Backfill author ORCID / OpenAlex IDs"
          description="For items that already have an OpenAlex ID, re-checks their authors against OpenAlex and fills in ORCID/OpenAlex profile links wherever they're still missing. This is what powers the badges next to author names. Only fills in blanks, safe to re-run any time."
          run={authorMetaBackfillRun}
          buttonOnRight
        >
          {hasOpenAlexApiKey ? (
            <RunAuthorMetaBackfillButton />
          ) : (
            <div className="tooltip" data-tip="Add an OpenAlex key on your Account page to enable this">
              <button type="button" className="btn btn-accent btn-sm text-base" disabled>
                Backfill ORCID/OpenAlex IDs
              </button>
            </div>
          )}
        </RunCard>
      </div>
    </div>
  )
}
