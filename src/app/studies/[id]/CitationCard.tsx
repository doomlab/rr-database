import { CollapsibleSection } from "../../components/CollapsibleSection"

export type CitationEntry = {
  title: string | null
  year: number | null
  journal: string | null
  doi?: string | null
  openalexId?: string
  match?: { id: number; studyId: number }
}

function externalHref(e: CitationEntry): string | null {
  if (e.doi) return e.doi.startsWith("http") ? e.doi : `https://doi.org/${e.doi}`
  if (e.openalexId) return `https://openalex.org/${e.openalexId}`
  return null
}

export function CitationCard({
  title,
  subtitle,
  entries,
  defaultOpen = true,
}: {
  title: string
  subtitle?: string
  entries: CitationEntry[]
  defaultOpen?: boolean
}) {
  return (
    <div className="py-4">
      <CollapsibleSection title={title} subtitle={subtitle} defaultOpen={defaultOpen}>
        <div className="space-y-1">
          {entries.map((e, i) =>
            e.match ? (
              <a
                key={i}
                href={`/studies/${e.match.studyId}`}
                className="flex gap-3 py-1.5 hover:text-primary group/item"
              >
                <span className="flex-1 text-base font-semibold text-base-content group-hover/item:underline">
                  {e.title ?? "Untitled"}
                </span>
                {e.year && <span className="text-base text-base-content/50 shrink-0">{e.year}</span>}
              </a>
            ) : externalHref(e) ? (
              <a
                key={i}
                href={externalHref(e)!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 py-1.5 hover:text-primary group/item"
              >
                <span className="flex-1 text-base text-base-content/60 group-hover/item:underline">
                  {e.title ?? "—"}
                  {e.journal && <span className="italic"> · {e.journal}</span>}
                </span>
                {e.year && <span className="text-base text-base-content/50 shrink-0">{e.year}</span>}
              </a>
            ) : (
              <div key={i} className="flex gap-3 py-1.5">
                <span className="flex-1 text-base text-base-content/60">
                  {e.title ?? "—"}
                  {e.journal && <span className="italic"> · {e.journal}</span>}
                </span>
                {e.year && <span className="text-base text-base-content/50 shrink-0">{e.year}</span>}
              </div>
            )
          )}
        </div>
      </CollapsibleSection>
    </div>
  )
}
