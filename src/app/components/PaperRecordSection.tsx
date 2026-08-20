import { ReportButton } from "./ReportButton"
import { PaperHistoryCard } from "./PaperHistoryCard"
import { CollapsibleSection } from "./CollapsibleSection"
import { CitationCard, type CitationEntry } from "./CitationCard"
import { AdminEnrichPanel } from "../(admin)/components/AdminEnrichPanel"
import { Row, humanizeItemType, capitalize } from "./PaperFields"

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
  authors: { author: { name: string } }[]
  extraction: {
    needsReview: boolean
    confidence: number | null
    extractedData: unknown
    codedBy: { name: string | null; email: string } | null
    verifiedBy: { name: string | null; email: string } | null
  } | null
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
              className="btn btn-outline btn-md text-base"
            >
              Go to page
            </a>
          )}
          {paper.registrationUrl && (
            <a
              href={paper.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-md text-base"
            >
              View registration{paper.registrationPlatform ? ` (${paper.registrationPlatform})` : ""}
            </a>
          )}
          {isAdmin && (
            <AdminEnrichPanel
              paperId={paper.id}
              hasOpenAlexApiKey={hasOpenAlexApiKey}
              reviewNext={reviewNext}
            />
          )}
          <a href={suggestEditHref} className="btn btn-warning btn-md text-base">
            Suggest edit
          </a>
        </div>
        <ReportButton paperId={paper.id} initialReported={isReported} isLoggedIn={!!userId} />
      </div>

      <div className="space-y-1.5 text-base">
        {paper.authors.length > 0 && (
          <Row label="Authors" value={paper.authors.map((pa) => pa.author.name).join(", ")} />
        )}
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
        <Row label="Item type" value={humanizeItemType(paper.itemType)} />
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
          label="Cited by"
          value={paper.citedByCount != null ? `${paper.citedByCount} papers` : undefined}
        />
        <Row label="Bias level" value={paper.biasLevel ?? undefined} />
        <Row label="DOI" value={paper.doi ?? undefined} />
        <Row label="URL" value={paper.url ?? undefined} />
        <Row label="Registration" value={paper.registrationUrl ?? undefined} />
        <Row label="OpenAlex ID" value={paper.openalexId ?? undefined} />
        {paper.abstract && (
          <div className="pt-2">
            <p className="text-base-content/70 leading-relaxed">{paper.abstract}</p>
          </div>
        )}
      </div>

      {paper.tags.length > 0 && (
        <div className="mt-4">
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
        <div className="mt-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-base-content/60 mb-2">
            Keywords
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {paper.keywords.map((kw) => (
              <a
                key={kw}
                href={`${keywordBasePath}?keyword=${encodeURIComponent(kw)}`}
                className={`badge ${kw === activeKeyword ? "badge-primary" : "badge-outline hover:badge-primary"}`}
              >
                {kw}
              </a>
            ))}
          </div>
        </div>
      )}

      {paper.zoteroNotes && (
        <div className="mt-4">
          <CollapsibleSection title="Notes (from Zotero)">
            <p className="text-base-content/70 leading-relaxed whitespace-pre-line">
              {paper.zoteroNotes}
            </p>
          </CollapsibleSection>
        </div>
      )}

      {paper.extraction && (
        <div className="mt-4">
          <CollapsibleSection title="Coded data">
            <div className="space-y-2">
              <p className="text-base text-base-content/50">
                {paper.extraction.needsReview ? "Needs review" : "Reviewed"}
                {paper.extraction.confidence != null &&
                  ` · confidence ${(paper.extraction.confidence * 100).toFixed(0)}%`}
                {paper.extraction.codedBy &&
                  ` · coded by ${paper.extraction.codedBy.name ?? paper.extraction.codedBy.email}`}
                {paper.extraction.verifiedBy &&
                  ` · verified by ${
                    paper.extraction.verifiedBy.name ?? paper.extraction.verifiedBy.email
                  }`}
              </p>
              <div className="space-y-1">
                {Object.entries(paper.extraction.extractedData as Record<string, unknown>).map(
                  ([key, value]) =>
                    value == null || value === "" ? null : (
                      <Row key={key} label={key} value={String(value)} />
                    )
                )}
              </div>
            </div>
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
