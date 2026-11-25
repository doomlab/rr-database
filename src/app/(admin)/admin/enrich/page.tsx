import db from "db"
import { Pagination } from "../../../components/Pagination"
import { SearchAndKeywordFilter } from "../../../components/SearchAndKeywordFilter"
import { NEEDS_ENRICH_WHERE } from "src/lib/needsEnrich"
import { EnrichStep } from "../workflow/EnrichStep"
import type { GroupPaper } from "../workflow/types"

// Small pages: each pull is a live API call, and "Pull everything" runs the
// whole page.
const PAGE_SIZE = 25

export const metadata = { title: "Enrich – Admin" }

export default async function EnrichPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const q = params.q?.trim() || undefined
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)

  const where = {
    AND: [
      NEEDS_ENRICH_WHERE,
      q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { doi: { contains: q, mode: "insensitive" as const } },
              { authors: { some: { author: { name: { contains: q, mode: "insensitive" as const } } } } },
            ],
          }
        : {},
    ],
  }

  const [rows, total] = await Promise.all([
    db.paper.findMany({
      where,
      include: {
        authors: { include: { author: true }, orderBy: { position: "asc" } },
        studyPaper: { select: { studyId: true, role: true } },
      },
      orderBy: { id: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.paper.count({ where }),
  ])

  const crossrefPulls = await db.paperEditHistory.groupBy({
    by: ["paperId"],
    where: { paperId: { in: rows.map((p) => p.id) }, source: "crossref" },
    _max: { createdAt: true },
  })
  const crossrefPulledAt = new Map(crossrefPulls.map((r) => [r.paperId, r._max.createdAt]))

  const papers: GroupPaper[] = rows.map((p) => ({
    id: p.id,
    title: p.title,
    year: p.year,
    venue: p.venue,
    doi: p.doi,
    url: p.url,
    status: p.status,
    stage: p.stage,
    authors: p.authors.map((pa) => pa.author.name),
    studyId: p.studyPaper?.studyId ?? null,
    role: p.studyPaper?.role ?? null,
    pcirrRole: null,
    openAlexFetchedAt: p.openAlexFetchedAt?.toISOString() ?? null,
    crossrefQueried: p.crossrefQueried,
    crossrefFound: p.crossrefFound,
    crossrefPulledAt: crossrefPulledAt.get(p.id)?.toISOString() ?? null,
    metadataVerifiedAt: p.metadataVerifiedAt?.toISOString() ?? null,
  }))

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const buildHref = (p: number) => {
    const sp = new URLSearchParams()
    if (q) sp.set("q", q)
    sp.set("page", String(p))
    return `/admin/enrich?${sp.toString()}`
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Enrich</h1>
      <p className="text-base text-base-content/60 mb-6">
        Confirmed items that still need data pulled from OpenAlex or Crossref ({total}). Items drop off this list once
        both sources have been tried. Check what came back in Metadata review.
      </p>

      <SearchAndKeywordFilter action="/admin/enrich" q={q} />

      {papers.length === 0 ? (
        <div className="text-center py-16 text-base-content/40">
          <p className="text-lg">{q ? "No results match your search." : "Nothing left to enrich."}</p>
          {q && (
            <a href="/admin/enrich" className="link link-primary text-base mt-2 inline-block">
              Clear search
            </a>
          )}
        </div>
      ) : (
        <>
          <EnrichStep papers={papers} />
          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
