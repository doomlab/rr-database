"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import pullPaperData from "../../mutations/pullPaperData"
import { NO_THROW, type GroupPaper } from "./types"


type Source = "openalex" | "crossref"

// Same wording for both sources: "<Source> pulled <date>" once it's been
// pulled, otherwise why it hasn't.
function SourceBadge({
  label,
  pulledAt,
  pulled = !!pulledAt,
  noMatch = false,
  needsDoi = false,
}: {
  label: string
  pulledAt: string | null
  pulled?: boolean
  noMatch?: boolean
  needsDoi?: boolean
}) {
  if (pulled) {
    return (
      <span className="badge badge-success">
        {label} pulled{pulledAt ? ` ${new Date(pulledAt).toLocaleDateString()}` : ""}
      </span>
    )
  }
  if (noMatch) return <span className="badge badge-warning">{label} no match</span>
  return <span className="badge badge-info">{label} {needsDoi ? "needs a DOI" : "not pulled"}</span>
}

export function EnrichStep({ papers }: { papers: GroupPaper[] }) {
  const [pull] = useMutation(pullPaperData, NO_THROW)
  const router = useRouter()
  const [running, setRunning] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const key = (paperId: number, source: Source) => `${paperId}:${source}`

  const run = async (paperId: number, source: Source) => {
    const k = key(paperId, source)
    setRunning(k)
    setErrors((prev) => {
      const { [k]: _, ...rest } = prev
      return rest
    })
    try {
      await pull({ paperId, source })
    } catch (e: any) {
      setErrors((prev) => ({ ...prev, [k]: e.message ?? "Pull failed" }))
    } finally {
      setRunning(null)
    }
  }

  const pullAll = async () => {
    for (const p of papers) {
      await run(p.id, "openalex")
      if (p.doi) await run(p.id, "crossref")
    }
    router.refresh()
  }

  const pullOne = async (paperId: number, source: Source) => {
    await run(paperId, source)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base text-base-content/60">
        Pull fresh data from OpenAlex or Crossref. It's saved straight away (and logged in each
        item's history); check the results in the Metadata step.
      </p>
      <ul className="flex flex-col divide-y divide-base-300">
        {papers.map((paper) => (
          <li key={paper.id} className="py-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-base leading-snug">
                #{paper.id} — {paper.title}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <SourceBadge label="OpenAlex" pulledAt={paper.openAlexFetchedAt} />
                <SourceBadge
                  label="Crossref"
                  pulledAt={paper.crossrefPulledAt}
                  pulled={paper.crossrefFound}
                  noMatch={paper.crossrefQueried && !paper.crossrefFound}
                  needsDoi={!paper.doi}
                />
              </div>
              {(["openalex", "crossref"] as const).map(
                (source) =>
                  errors[key(paper.id, source)] && (
                    <p key={source} className="text-base text-error mt-1">
                      {source === "openalex" ? "OpenAlex" : "Crossref"}: {errors[key(paper.id, source)]}
                    </p>
                  )
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {(["openalex", "crossref"] as const).map((source) => (
                <button
                  key={source}
                  className={`btn btn-sm text-base w-40 whitespace-nowrap ${source === "openalex" ? "btn-primary" : "btn-secondary"}`}
                  disabled={running !== null || (source === "crossref" && !paper.doi)}
                  title={source === "crossref" && !paper.doi ? "Crossref looks items up by DOI, and this one has none" : undefined}
                  onClick={() => pullOne(paper.id, source)}
                >
                  {running === key(paper.id, source) ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : source === "openalex" ? (
                    "Pull OpenAlex"
                  ) : (
                    "Pull Crossref"
                  )}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {papers.length > 1 && (
        <div className="flex items-center gap-2">
          <button className="btn btn-accent btn-sm text-base whitespace-nowrap" disabled={running !== null} onClick={pullAll}>
            Pull everything for all papers
          </button>
        </div>
      )}
    </div>
  )
}
