import { ReportButton } from "./ReportButton"
import { PaperHistoryCard } from "./PaperHistoryCard"
import { CollapsibleSection } from "./CollapsibleSection"
import { CitationCard, type CitationEntry } from "./CitationCard"
import { AdminEnrichPanel } from "../(admin)/components/AdminEnrichPanel"
import { JmirBadgeButton } from "../(admin)/components/JmirBadgeButton"
import { ScanPaperPdfButton } from "../(admin)/components/ScanPaperPdfButton"
import { Row, humanizeItemType, capitalize } from "./PaperFields"
import { AuthorList } from "./AuthorList"
import { JMIR_BADGE_OPTIONS } from "src/lib/jmirBadgeOptions"

type RecordPaper = {
  id: number
  doi: string | null
  url: string | null
  pdfUrl: string | null
  openAccess: boolean | null
  openAccessStatus: string | null
  year: number | null
  venue: string | null
  publisher: string | null
  volume: string | null
  issue: string | null
  pages: string | null
  issn: string | null
  language: string | null
  itemType: string | null
  citedByCount: number | null
  abstract: string | null
  keywords: string[]
  tags: string[]
  registrationUrl: string | null
  registrationPlatform: string | null
  biasLevel: string | null
  openalexId: string | null
  zoteroNotes: string | null
  openDataUrl: string | null
  openCodeUrl: string | null
  openMaterialsUrl: string | null
  jmirBadgeType: string | null
  jmirBadgeCounterpartDoi: string | null
  jmirBadgeCheckedAt: Date | null
  openSciencePracticesScannedAt: Date | null
  metadataVerifiedAt: Date | null
  metadataVerifiedBy: { name: string | null; email: string } | null
  authors: { author: { name: string; orcid: string | null; openalexAuthorId: string | null } }[]
  editHistory: {
    id: number
    createdAt: Date
    source: string
    summary: string | null
    user: { name: string | null; email: string }
  }[]
}

type CitationData = {
  references: CitationEntry[]
  referencesInDbCount: number
  citedBy: CitationEntry[]
  citedByInDbCount: number
  citedByTotal: number | null
}

export function PaperRecordSection({
  paper,
  roleLabel,
  citationData,
  isAdmin,
  hasOpenAlexApiKey,
  userId,
  isReported,
  keywordBasePath,
  activeKeyword,
  suggestEditHref,
  citationsDefaultOpen = false,
  reviewNext,
}: {
  paper: RecordPaper
  roleLabel: string
  citationData: CitationData
  isAdmin: boolean
  hasOpenAlexApiKey: boolean
  userId: number | undefined
  isReported: boolean
  keywordBasePath: string
  activeKeyword?: string
  suggestEditHref: string
  citationsDefaultOpen?: boolean
  reviewNext?: string
}) {
  const { references, referencesInDbCount, citedBy, citedByInDbCount, citedByTotal } = citationData

  const citedByParts: string[] = []
  if (citedByInDbCount > 0) citedByParts.push(`${citedByInDbCount} in RR Database`)
  if (citedByTotal != null) citedByParts.push(`${citedByTotal.toLocaleString()} total`)

  return (
    <div className="py-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-base-content/40 mb-3">
        {roleLabel}
      </h2>

      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-start gap-2">
          {paper.doi && (
            <a
              href={`https://doi.org/${paper.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-md text-base"
            >
              View article (DOI)
            </a>
          )}
          {paper.pdfUrl && (
            <a
              href={paper.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-md text-base"
            >
              {paper.openAccess ? "Open access PDF" : "View PDF"}
            </a>
          )}
          {paper.url && (
            <a
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-info btn-md text-base"
            >
              Go to page
            </a>
          )}
          {paper.registrationUrl && (
            <a
              href={paper.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-md text-base"
            >
              View registration{paper.registrationPlatform ? ` (${paper.registrationPlatform})` : ""}
            </a>
          )}
          {paper.openDataUrl && (
            <a
              href={paper.openDataUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-success btn-md text-base"
            >
              Open data
            </a>
          )}
          {paper.openCodeUrl && (
            <a
              href={paper.openCodeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-accent btn-md text-base"
            >
              Open code
            </a>
          )}
          {paper.openMaterialsUrl && (
            <a
              href={paper.openMaterialsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-success btn-md text-base"
            >
              Open materials
            </a>
          )}
          {isAdmin && paper.doi?.startsWith("10.2196/") && (
            <JmirBadgeButton paperId={paper.id} alreadyChecked={!!paper.jmirBadgeCheckedAt} />
          )}
          {isAdmin && !paper.openSciencePracticesScannedAt && (
            <ScanPaperPdfButton paperId={paper.id} hasPdfUrl={!!paper.pdfUrl} />
          )}
          {isAdmin && (
            <AdminEnrichPanel
              paperId={paper.id}
              hasOpenAlexApiKey={hasOpenAlexApiKey}
              reviewNext={reviewNext}
            />
          )}
          <a href={suggestEditHref} className="btn btn-warning btn-md text-base">
            {isAdmin ? "Edit metadata" : "Suggest edit"}
          </a>
        </div>
        <ReportButton paperId={paper.id} initialReported={isReported} isLoggedIn={!!userId} />
      </div>

      {isAdmin && paper.metadataVerifiedAt && (
        <p className="text-base text-success mb-3">
          Metadata verified by{" "}
          {paper.metadataVerifiedBy?.name ?? paper.metadataVerifiedBy?.email ?? "someone"} on{" "}
          {paper.metadataVerifiedAt.toLocaleDateString()}
        </p>
      )}

      <div className="text-base mb-4">
        <AuthorList
          authors={paper.authors.map((pa) => ({
            name: pa.author.name,
            orcid: pa.author.orcid,
            openalexAuthorId: pa.author.openalexAuthorId,
          }))}
        />
      </div>

      <div className="space-y-4">
        {(paper.abstract ||
          paper.venue ||
          paper.publisher ||
          paper.year ||
          paper.volume ||
          paper.issue ||
          paper.pages ||
          paper.issn ||
          paper.language) && (
          <CollapsibleSection title="Publication details" defaultOpen>
            <div className="space-y-1.5">
              <Row label="Year" value={paper.year?.toString()} />
              <Row label="Venue" value={paper.venue ?? undefined} italic />
              <Row label="Publisher" value={paper.publisher ?? undefined} />
              <Row
                label="Volume / Issue"
                value={[paper.volume, paper.issue].filter(Boolean).join(" / ") || undefined}
              />
              <Row label="Pages" value={paper.pages ?? undefined} />
              <Row label="ISSN" value={paper.issn ?? undefined} />
              <Row label="Language" value={paper.language ?? undefined} />
              {paper.abstract && (
                <div className="pt-2">
                  <p className="text-base-content/70 leading-relaxed">{paper.abstract}</p>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {(paper.doi || paper.url || paper.pdfUrl || paper.itemType) && (
          <CollapsibleSection title="Identifiers & links" defaultOpen>
            <div className="space-y-1.5">
              <Row label="DOI" value={paper.doi ?? undefined} />
              <Row label="URL" value={paper.url ?? undefined} />
              <Row label="PDF URL" value={paper.pdfUrl ?? undefined} />
              <Row label="Item type" value={humanizeItemType(paper.itemType)} />
            </div>
          </CollapsibleSection>
        )}

        {(paper.openAccess != null ||
          paper.registrationUrl ||
          paper.openDataUrl ||
          paper.openCodeUrl ||
          paper.openMaterialsUrl) && (
          <CollapsibleSection title="Open science & registration" defaultOpen>
            <div className="space-y-1.5">
              <Row
                label="Open access"
                value={
                  paper.openAccess == null
                    ? undefined
                    : paper.openAccess
                    ? `Yes${paper.openAccessStatus ? ` (${capitalize(paper.openAccessStatus)})` : ""}`
                    : "No"
                }
              />
              <Row
                label="Registration"
                value={
                  paper.registrationUrl
                    ? `${paper.registrationUrl}${
                        paper.registrationPlatform ? ` (${paper.registrationPlatform})` : ""
                      }`
                    : undefined
                }
              />
              <Row label="Open data" value={paper.openDataUrl ?? undefined} />
              <Row label="Open code" value={paper.openCodeUrl ?? undefined} />
              <Row label="Open materials" value={paper.openMaterialsUrl ?? undefined} />
            </div>
          </CollapsibleSection>
        )}

        {(paper.tags.length > 0 || paper.keywords.length > 0) && (
          <CollapsibleSection title="Tags & keywords" defaultOpen>
            <div className="space-y-3">
              {paper.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-base-content/60 mb-2">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {paper.tags.map((tag) => (
                      <span key={tag} className="badge badge-secondary badge-outline">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {paper.keywords.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-base-content/60 mb-2">
                    Keywords
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {paper.keywords.map((kw) => (
                      <a
                        key={kw}
                        href={`${keywordBasePath}?keyword=${encodeURIComponent(kw)}`}
                        className={`badge ${
                          kw === activeKeyword ? "badge-primary" : "badge-outline hover:badge-primary"
                        }`}
                      >
                        {kw}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {(paper.jmirBadgeType || paper.jmirBadgeCounterpartDoi || paper.biasLevel) && (
          <CollapsibleSection title="JMIR / PCI RR badges" defaultOpen>
            <div className="space-y-1.5">
              <Row
                label="JMIR badge"
                value={
                  paper.jmirBadgeType
                    ? JMIR_BADGE_OPTIONS.find((o) => o.value === paper.jmirBadgeType)?.label ??
                      paper.jmirBadgeType
                    : undefined
                }
              />
              <Row label="JMIR counterpart DOI" value={paper.jmirBadgeCounterpartDoi ?? undefined} />
              <Row label="Bias level" value={paper.biasLevel ?? undefined} />
            </div>
          </CollapsibleSection>
        )}

        {(paper.citedByCount != null || paper.openalexId) && (
          <CollapsibleSection title="Metrics & external IDs" defaultOpen>
            <div className="space-y-1.5">
              <Row
                label="Cited by"
                value={paper.citedByCount != null ? `${paper.citedByCount} papers` : undefined}
              />
              <Row label="OpenAlex ID" value={paper.openalexId ?? undefined} />
            </div>
          </CollapsibleSection>
        )}
      </div>

      {paper.zoteroNotes && (
        <div className="mt-4">
          <CollapsibleSection title="Notes (from Zotero)">
            <p className="text-base-content/70 leading-relaxed whitespace-pre-line">
              {paper.zoteroNotes}
            </p>
          </CollapsibleSection>
        </div>
      )}

      <div className="divide-y divide-base-200 border-t border-base-200 mt-2">
        {citedBy.length > 0 && (
          <CitationCard
            title="Cited by"
            subtitle={citedByParts.join(" · ")}
            entries={citedBy}
            defaultOpen={citationsDefaultOpen}
          />
        )}
        {references.length > 0 && (
          <CitationCard
            title="References"
            subtitle={`${referencesInDbCount} in RR Database · ${references.length} total`}
            entries={references}
            defaultOpen={citationsDefaultOpen}
          />
        )}
      </div>

      <div className="mt-3">
        <PaperHistoryCard entries={paper.editHistory} />
      </div>
    </div>
  )
}
