import { notFound } from "next/navigation"
import db from "db"
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

  return (
    <div>
      <a href="/admin/suggestions" className="text-base text-base-content/50 hover:text-base-content mb-6 inline-block">
        ← Back to article suggestions
      </a>

      <h1 className="text-2xl font-bold leading-snug mb-1">Review suggestion</h1>
      <p className="text-base-content/60 mb-8">
        Suggested by {suggestion.user.name ?? suggestion.user.email} on{" "}
        {suggestion.createdAt.toLocaleDateString()}
        {suggestion.resolved && " · already resolved"}
      </p>

      <SuggestionWorkflow suggestion={suggestion} backHref="/admin/suggestions" />
    </div>
  )
}
