import { CollapsibleSection } from "./CollapsibleSection"

const SOURCE_LABELS: Record<string, string> = {
  openalex: "Pulled data from OpenAlex",
  crossref: "Pulled data from Crossref",
  manual: "Edited",
  review: "Reviewed",
}

export type PaperHistoryEntry = {
  id: number
  createdAt: Date
  source: string
  summary: string | null
  user: { name: string | null; email: string }
}

export function PaperHistoryCard({ entries }: { entries: PaperHistoryEntry[] }) {
  if (entries.length === 0) return null

  return (
    <CollapsibleSection title="Edit history">
      <div className="space-y-2">
        {entries.map((entry) => {
          const action = SOURCE_LABELS[entry.source] ?? entry.source
          const label = entry.summary
            ? `${action}: ${entry.summary} — ${entry.user.name ?? entry.user.email}`
            : `${action} — ${entry.user.name ?? entry.user.email}`
          return <HistoryEvent key={entry.id} label={label} date={entry.createdAt} />
        })}
      </div>
    </CollapsibleSection>
  )
}

function HistoryEvent({ label, date }: { label: React.ReactNode; date: Date }) {
  const formatted = date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  return (
    <div className="flex items-baseline gap-2 text-base text-base-content/70">
      <span className="shrink-0">·</span>
      <span>{label}</span>
      <span className="shrink-0">{formatted}</span>
    </div>
  )
}
