import { notFound } from "next/navigation"
import { Navbar } from "../../components/Navbar"
import { FavoriteButton } from "../../components/FavoriteButton"
import { ReportButton } from "../../components/ReportButton"
import { PaperHistoryCard } from "../../components/PaperHistoryCard"
import { CollapsibleSection } from "../../components/CollapsibleSection"
import { CitationCard, type CitationEntry } from "./CitationCard"
import { AdminEnrichPanel } from "../../(admin)/components/AdminEnrichPanel"
import { getBlitzContext } from "../../blitz-server"
import { fetchCitingWorks } from "src/lib/fetchCitingWorks"
import db from "db"

const CONFIRMED_STATUSES: ("IMPORTED" | "APPROVED")[] = ["IMPORTED", "APPROVED"]

async function resolveCitations(paper: {
  id: number
  openalexId: string | null
  citedByCount: number | null
  citationsFrom: {
    citedOpenAlexId: string
    title: string | null
    year: number | null
    journal: string | null
    doi: string | null
  }[]
}) {
  const citedByResult = paper.openalexId
    ? await fetchCitingWorks(paper.openalexId)
    : { works: [], total: null }

  const allOpenAlexIds = [
    ...paper.citationsFrom.map((c) => c.citedOpenAlexId),
    ...citedByResult.works.map((w) => w.openalexId),
  ]

  const matchedCitations =
    allOpenAlexIds.length > 0
      ? await db.paper.findMany({
          where: { openalexId: { in: allOpenAlexIds }, status: { in: CONFIRMED_STATUSES } },
          select: {
            id: true,
            openalexId: true,
            studyPaper: { select: { studyId: true } },
            canonical: { select: { id: true, studyPaper: { select: { studyId: true } } } },
          },
        })
      : []

  const matchedById = new Map<string, { id: number; studyId: number }>()
  for (const p of matchedCitations) {
    const resolved = p.canonical ?? p
    const studyId = resolved.studyPaper?.studyId
    if (p.openalexId && studyId != null) {
      matchedById.set(p.openalexId, { id: resolved.id, studyId })
    }
  }

  const references: CitationEntry[] = paper.citationsFrom.map((c) => ({
    title: c.title,
    year: c.year,
    journal: c.journal,
    doi: c.doi,
    openalexId: c.citedOpenAlexId,
    match: matchedById.get(c.citedOpenAlexId),
  }))

  const citedBy: CitationEntry[] = citedByResult.works.map((w) => ({
    title: w.title,
    year: w.year,
    journal: w.journal,
    doi: w.doi,
    openalexId: w.openalexId,
    match: matchedById.get(w.openalexId),
  }))

  return {
    references,
    referencesInDbCount: references.filter((r) => r.match).length,
    citedBy,
    citedByInDbCount: citedBy.filter((c) => c.match).length,
    citedByTotal: citedByResult.total ?? paper.citedByCount,
  }
}

const ROLE_LABELS: Record<string, string> = {
  STAGE1_ARTICLE: "Stage 1 article",
  STAGE1_MATERIALS: "Stage 1 materials",
  STAGE2_ARTICLE: "Stage 2 article",
  STAGE2_MATERIALS: "Stage 2 materials",
  OTHER: "Record",
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const study = await db.study.findUnique({
    where: { id: Number(id) },
    include: { papers: { include: { paper: { select: { title: true } } } } },
  })
  const title = study?.papers[0]?.paper.title
  return { title: title ? `${title} – RR Database` : "Registered Report – RR Database" }
}

export default async function StudyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await getBlitzContext()
  const userId = ctx.session.userId as number | undefined
  const isAdmin = ctx.session.role === "ADMIN" || ctx.session.role === "SUPER_ADMIN"

  const study = await db.study.findUnique({
    where: { id: Number(id) },
    include: {
      papers: {
        where: { paper: { status: { in: ["IMPORTED", "APPROVED"] } } },
        include: {
          paper: {
            include: {
              authors: { include: { author: true }, orderBy: { position: "asc" } },
              extraction: {
                include: {
                  codedBy: { select: { name: true, email: true } },
                  verifiedBy: { select: { name: true, email: true } },
                },
              },
              citationsFrom: { orderBy: { year: "desc" } },
              editHistory: {
                include: { user: { select: { name: true, email: true } } },
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
        orderBy: { role: "asc" },
      },
    },
  })

  if (!study || study.papers.length === 0) notFound()

  const citationDataByPaperId = new Map(
    await Promise.all(
      study.papers.map(async ({ paper }) => [paper.id, await resolveCitations(paper)] as const)
    )
  )

  const [isFavorited, reportedIds] = await Promise.all([
    userId
      ? db.studyFavorite
          .findUnique({ where: { userId_studyId: { userId, studyId: study.id } } })
          .then(Boolean)
      : false,
    userId
      ? db.paperReport
          .findMany({ where: { userId }, select: { paperId: true } })
          .then((rows) => new Set(rows.map((r) => r.paperId)))
      : Promise.resolve(new Set<number>()),
  ])

  const headlinePaper = study.papers[0]?.paper

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <Navbar />

      <div className="w-full px-10 py-10">
        <div className="w-[90%] mx-auto">
          <a href="/" className="text-sm text-base-content/50 hover:text-base-content mb-6 inline-block">
            ← Back to browse
          </a>

          <div className="flex items-start justify-between gap-4 mb-8">
            <h1 className="text-3xl font-bold leading-snug">{headlinePaper?.title}</h1>
            <div className="flex items-center gap-2 shrink-0 pt-1">
              <FavoriteButton
                studyId={study.id}
                initialFavorited={isFavorited}
                isLoggedIn={!!userId}
              />
            </div>
          </div>

          {(study.registrationUrl || study.biasLevel) && (
            <div className="flex flex-wrap gap-2 mb-8">
              {study.registrationUrl && (
                <a
                  href={study.registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  View registration{study.registrationPlatform ? ` (${study.registrationPlatform})` : ""}
                </a>
              )}
              {study.biasLevel && <span className="badge badge-info">{study.biasLevel}</span>}
            </div>
          )}

          <div className="divide-y divide-base-200">
            {study.papers.map(({ paper, role }) => (
              <div key={paper.id} className="py-6">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-base-content/40">
                    {ROLE_LABELS[role] ?? role}
                  </h2>
                  <ReportButton
                    paperId={paper.id}
                    initialReported={reportedIds.has(paper.id)}
                    isLoggedIn={!!userId}
                  />
                </div>

                {(paper.doi || paper.pdfUrl || isAdmin) && (
                  <div className="flex flex-wrap items-start gap-2 mb-3">
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
                    {isAdmin && <AdminEnrichPanel paperId={paper.id} />}
                  </div>
                )}

                <div className="space-y-1.5 text-base">
                  {paper.authors.length > 0 && (
                    <Row
                      label="Authors"
                      value={paper.authors.map((pa) => pa.author.name).join(", ")}
                    />
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
                    value={paper.openAccess == null ? undefined : paper.openAccess ? "Yes" : "No"}
                  />
                  <Row
                    label="Cited by"
                    value={paper.citedByCount != null ? `${paper.citedByCount} papers` : undefined}
                  />
                  {paper.abstract && (
                    <div className="pt-2">
                      <p className="text-base-content/70 leading-relaxed">{paper.abstract}</p>
                    </div>
                  )}
                </div>

                {paper.extraction && (
                  <div className="mt-4">
                    <CollapsibleSection title="Coded data">
                      <div className="space-y-2">
                        <p className="text-sm text-base-content/50">
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

                {(() => {
                  const { references, referencesInDbCount, citedBy, citedByInDbCount, citedByTotal } =
                    citationDataByPaperId.get(paper.id)!

                  const citedByParts: string[] = []
                  if (citedByInDbCount > 0) citedByParts.push(`${citedByInDbCount} in RR Database`)
                  if (citedByTotal != null) citedByParts.push(`${citedByTotal.toLocaleString()} total`)

                  return (
                    <div className="divide-y divide-base-200 border-t border-base-200 mt-2">
                      {citedBy.length > 0 && (
                        <CitationCard title="Cited by" subtitle={citedByParts.join(" · ")} entries={citedBy} />
                      )}
                      {references.length > 0 && (
                        <CitationCard
                          title="References"
                          subtitle={`${referencesInDbCount} in RR Database · ${references.length} total`}
                          entries={references}
                        />
                      )}
                    </div>
                  )
                })()}

                <div className="mt-3">
                  <PaperHistoryCard entries={paper.editHistory} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function humanizeItemType(itemType: string | null): string | undefined {
  if (!itemType) return undefined
  const words = itemType
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
  return words.map((w) => w[0]!.toUpperCase() + w.slice(1)).join(" ")
}

function Row({ label, value, italic }: { label: string; value?: string; italic?: boolean }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-1.5">
      <span className="w-32 shrink-0 font-medium text-base-content/70">{label}</span>
      <span className={`text-base-content/80 ${italic ? "italic" : ""}`}>{value}</span>
    </div>
  )
}
