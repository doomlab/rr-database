import db from "db"
import { ResolveButton } from "../../components/ResolveButton"
import resolveExtractionEdit from "../../mutations/resolveExtractionEdit"

export default async function ExtractionQueuePage() {
  const suggestions = await db.extractionEditSuggestion.findMany({
    where: { resolved: false },
    include: {
      paper: { select: { id: true, title: true } },
      user: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Extraction edit suggestions</h1>
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
                <h2 className="font-semibold text-base leading-snug">{s.paper.title}</h2>
                <pre className="text-xs bg-base-200 rounded p-2 overflow-x-auto max-w-lg">
                  {JSON.stringify(s.suggestedData, null, 2)}
                </pre>
                <p className="text-xs text-base-content/40">
                  Suggested by {s.user.email}
                  {s.note ? ` — "${s.note}"` : ""}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <ResolveButton
                  mutation={resolveExtractionEdit}
                  input={{ suggestionId: s.id, apply: true }}
                  label="Apply"
                />
                <ResolveButton
                  mutation={resolveExtractionEdit}
                  input={{ suggestionId: s.id, apply: false }}
                  label="Dismiss"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
