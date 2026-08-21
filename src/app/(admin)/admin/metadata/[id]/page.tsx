import { notFound } from "next/navigation"
import db from "db"
import { ApplySuggestionForm } from "./ApplySuggestionForm"

export const metadata = { title: "Review metadata suggestion – Admin" }

const FIELD_KEYS = [
  "title",
  "doi",
  "abstract",
  "year",
  "venue",
  "volume",
  "issue",
  "pages",
  "publisher",
  "url",
  "issn",
  "language",
  "itemType",
  "pdfUrl",
  "openAccess",
  "openAccessStatus",
  "citedByCount",
  "openalexId",
  "registrationUrl",
  "registrationPlatform",
  "biasLevel",
  "openDataUrl",
  "openCodeUrl",
  "openMaterialsUrl",
  "zoteroNotes",
  "jmirBadgeType",
  "jmirBadgeCounterpartDoi",
] as const

export default async function MetadataSuggestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const suggestion = await db.metadataEditSuggestion.findUnique({
    where: { id: Number(id) },
    include: { user: { select: { name: true, email: true } } },
  })
  if (!suggestion) notFound()

  const paper = await db.paper.findUnique({
    where: { id: suggestion.paperId },
    include: { authors: { include: { author: true }, orderBy: { position: "asc" } } },
  })
  if (!paper) notFound()

  const suggestedFields = new Set(FIELD_KEYS.filter((f) => suggestion[f] !== null && suggestion[f] !== undefined))

  const initial: Record<(typeof FIELD_KEYS)[number] | "tags" | "keywords", string | number | boolean | null> =
    {} as any
  for (const key of FIELD_KEYS) {
    const suggestedValue = suggestion[key]
    const currentValue = (paper as any)[key]
    initial[key] = suggestedValue ?? currentValue ?? null
  }
  initial.tags = ((suggestion.tags.length > 0 ? suggestion.tags : paper.tags) as string[]).join(", ") as any
  initial.keywords = ((suggestion.keywords.length > 0 ? suggestion.keywords : paper.keywords) as string[]).join(
    ", "
  ) as any

  const suggestionAuthors = suggestion.authors as unknown as { id: number | null; name: string }[]
  const currentAuthorsById = new Map(paper.authors.map((pa) => [pa.author.id, pa.author]))
  const initialAuthors =
    suggestionAuthors.length > 0
      ? suggestionAuthors.map((a) => {
          const match = a.id ? currentAuthorsById.get(a.id) : undefined
          return {
            id: a.id,
            name: a.name,
            orcid: match?.orcid ?? null,
            openalexAuthorId: match?.openalexAuthorId ?? null,
          }
        })
      : paper.authors.map((pa) => ({
          id: pa.author.id,
          name: pa.author.name,
          orcid: pa.author.orcid,
          openalexAuthorId: pa.author.openalexAuthorId,
        }))

  return (
    <div>
      <a
        href="/admin/metadata"
        className="text-base text-base-content/50 hover:text-base-content mb-6 inline-block"
      >
        ← Back to metadata edit suggestions
      </a>

      <h1 className="text-2xl font-bold leading-snug mb-1">Review metadata suggestion</h1>
      <p className="text-base-content/60 mb-2">{paper.title}</p>
      <p className="text-base-content/60 mb-8">
        Suggested by {suggestion.user.name ?? suggestion.user.email} on{" "}
        {suggestion.createdAt.toLocaleDateString()}
        {suggestion.note && ` — "${suggestion.note}"`}
        {suggestion.resolved && " · already resolved"}
      </p>

      <ApplySuggestionForm
        suggestionId={suggestion.id}
        initial={initial}
        initialAuthors={initialAuthors}
        suggestedFields={suggestedFields as any}
        backHref="/admin/metadata"
      />
    </div>
  )
}
