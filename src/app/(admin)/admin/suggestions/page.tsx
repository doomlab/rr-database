import db from "db"
import { ResolveButton } from "../../components/ResolveButton"
import resolveSuggestion from "../../mutations/resolveSuggestion"

export default async function SuggestionsQueuePage() {
  const suggestions = await db.articleSuggestion.findMany({
    where: { resolved: false },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Article suggestions</h1>
      <p className="text-base-content/60 mb-8">
        {suggestions.length} unresolved suggestion{suggestions.length === 1 ? "" : "s"}
      </p>

      {suggestions.length === 0 ? (
        <p className="text-base-content/40">Nothing to review.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-base-200">
          {suggestions.map((s) => (
            <li key={s.id} className="py-4 flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <h2 className="font-semibold text-base leading-snug">{s.title ?? "(no title given)"}</h2>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-base-content/50">
                  {s.authors && <span>{s.authors}</span>}
                  {s.year && <span>{s.year}</span>}
                  {s.doi && <span className="font-mono">{s.doi}</span>}
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="link">
                      link
                    </a>
                  )}
                </div>
                <p className="text-xs text-base-content/40">
                  Suggested by {s.user.email}
                  {s.note ? ` — "${s.note}"` : ""}
                </p>
              </div>
              <ResolveButton mutation={resolveSuggestion} input={{ suggestionId: s.id }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
