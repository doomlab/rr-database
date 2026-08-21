import db from "db"
import { Pagination } from "../../../components/Pagination"
import { SearchAndKeywordFilter } from "../../../components/SearchAndKeywordFilter"

const PAGE_SIZE = 50

export default async function MetadataReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const q = params.q?.trim() || undefined
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const where = {
    canonicalPaperId: null,
    metadataVerifiedAt: null,
    OR: [{ openSciencePracticesScannedAt: { not: null } }, { jmirBadgeCheckedAt: { not: null } }],
    ...(q
      ? {
          AND: [
            {
              OR: [
                { title: { contains: q, mode: "insensitive" as const } },
                { doi: { contains: q, mode: "insensitive" as const } },
                {
                  authors: {
                    some: { author: { name: { contains: q, mode: "insensitive" as const } } },
                  },
                },
              ],
            },
          ],
        }
      : {}),
  }

  const [papers, totalPapers] = await Promise.all([
    db.paper.findMany({
      where,
      include: { authors: { include: { author: true }, orderBy: { position: "asc" } } },
      orderBy: { updatedAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    db.paper.count({ where }),
  ])

  const totalPages = Math.ceil(totalPapers / PAGE_SIZE)
  const buildHref = (p: number) => {
    const sp = new URLSearchParams()
    if (q) sp.set("q", q)
    sp.set("page", String(p))
    return `/admin/metadata-review?${sp.toString()}`
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Metadata review</h1>
      <p className="text-base text-base-content/60 mb-6">
        Papers with auto-detected metadata (open science links, JMIR badge info) that hasn't been
        confirmed by a human yet. Open a paper, check what got filled in, and click "Mark metadata
        verified" once it looks right.
      </p>

      <SearchAndKeywordFilter action="/admin/metadata-review" q={q} />

      <div className="flex items-center justify-between mb-5">
        <p className="text-base text-base-content/60">
          <span className="font-semibold text-base-content">{totalPapers}</span> paper
          {totalPapers === 1 ? "" : "s"} awaiting metadata verification
        </p>
      </div>

      {papers.length === 0 ? (
        <div className="text-center py-16 text-base-content/40">
          <p className="text-lg">{q ? "No results match your search." : "Nothing to verify."}</p>
          {q && (
            <a href="/admin/metadata-review" className="link link-primary text-sm mt-2 inline-block">
              Clear search
            </a>
          )}
        </div>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-base-200">
            {papers.map((paper) => (
              <li
                key={paper.id}
                className="py-5 hover:bg-base-200/40 px-3 -mx-3 rounded-lg transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-base leading-snug mb-1">{paper.title}</h2>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/50">
                      {paper.authors.length > 0 && (
                        <>
                          <span>{paper.authors.map((pa) => pa.author.name).join(", ")}</span>
                          <span>·</span>
                        </>
                      )}
                      {paper.year && <span>{paper.year}</span>}
                      {paper.venue && (
                        <>
                          <span>·</span>
                          <span className="italic">{paper.venue}</span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {paper.openSciencePracticesScannedAt && (
                        <span className="badge badge-sm badge-outline">PDF scanned</span>
                      )}
                      {paper.jmirBadgeCheckedAt && (
                        <span className="badge badge-sm badge-outline">JMIR badge checked</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a href={`/papers/${paper.id}`} className="btn btn-primary btn-sm">
                      View
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
        </>
      )}
    </div>
  )
}
