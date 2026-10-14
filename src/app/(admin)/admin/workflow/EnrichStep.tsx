"use client"

import type { GroupPaper } from "./types"

export function EnrichStep({ papers }: { papers: GroupPaper[] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-base text-base-content/60">
        Pull fresh data from OpenAlex or Crossref for each paper. Each opens in a new tab; come back
        and refresh the step when you've saved.
      </p>
      <ul className="flex flex-col divide-y divide-base-300">
        {papers.map((paper) => (
          <li key={paper.id} className="py-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-base leading-snug">
                #{paper.id} — {paper.title}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`badge ${paper.openAlexFetchedAt ? "badge-success" : "badge-ghost"}`}>
                  OpenAlex {paper.openAlexFetchedAt ? `pulled ${new Date(paper.openAlexFetchedAt).toLocaleDateString()}` : "not pulled"}
                </span>
                <span className={`badge ${paper.crossrefFound ? "badge-success" : paper.crossrefQueried ? "badge-warning" : "badge-ghost"}`}>
                  Crossref {paper.crossrefFound ? "found" : paper.crossrefQueried ? "no match" : "not queried"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href={`/admin/papers/${paper.id}/pull?source=openalex`} target="_blank" rel="noreferrer" className="btn btn-accent btn-sm text-base">
                Pull OpenAlex
              </a>
              <a href={`/admin/papers/${paper.id}/pull?source=crossref`} target="_blank" rel="noreferrer" className="btn btn-accent btn-sm text-base">
                Pull Crossref
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
