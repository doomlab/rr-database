import { notFound } from "next/navigation"
import db from "db"
import { findExistingPaper } from "src/lib/findExistingPaper"
import { SuggestionWorkflow } from "./SuggestionWorkflow"

export const metadata = { title: "Review suggestion – Admin" }

export default async function SuggestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const suggestion = await db.articleSuggestion.findUnique({
    where: { id: Number(id) },
    include: { user: { select: { name: true, email: true } } },
  })
  if (!suggestion) notFound()

  const existing = await findExistingPaper(suggestion)

  return (
    <div>
      <a href="/admin/suggestions" className="text-base text-base-content/60 hover:text-base-content mb-6 inline-block">
        ← Back to article suggestions
      </a>

      <h1 className="text-2xl font-bold leading-snug mb-1">Review suggestion</h1>
      <p className="text-base-content/60 mb-8">
        Suggested by {suggestion.user.name ?? suggestion.user.email} on{" "}
        {suggestion.createdAt.toLocaleDateString()}
        {suggestion.resolved && " · already resolved"}
      </p>

      {existing && (
        <p className="text-base text-warning mb-6">
          {existing.matchedOn === "title" ? "Something similar" : `An item with the same ${existing.matchedOn === "doi" ? "DOI" : "link"}`}{" "}
          is already in the database:{" "}
          <a href={`/admin/review/${existing.id}`} className="link">
            "{existing.title}"
          </a>
        </p>
      )}

      <SuggestionWorkflow suggestion={suggestion} backHref="/admin/suggestions" />
    </div>
  )
}
