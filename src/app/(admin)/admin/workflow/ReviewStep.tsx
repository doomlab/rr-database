"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import reviewPaper from "../../mutations/reviewPaper"
import { NO_THROW, type GroupPaper } from "./types"


const STATUS_BADGE: Record<string, string> = {
  PENDING_REVIEW: "badge-warning",
  APPROVED: "badge-success",
  IMPORTED: "badge-success",
  REJECTED: "badge-error",
  DUPLICATE: "badge-neutral",
}

export function ReviewStep({ papers }: { papers: GroupPaper[] }) {
  const [review] = useMutation(reviewPaper, NO_THROW)
  const router = useRouter()
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const decide = async (paperId: number, decision: "APPROVED" | "REJECTED") => {
    setError(null)
    setBusyId(paperId)
    try {
      await review({ paperId, decision })
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Could not save the decision")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base text-base-content/60">
        Approve the items that are real registered reports and reject the rest. Rejected items
        drop out of the later steps.
      </p>
      <ul className="flex flex-col divide-y divide-base-300">
        {papers.map((paper) => (
          <li key={paper.id} className="py-4 flex flex-col md:flex-row md:items-start gap-3">
            <div className="flex-1 min-w-0">
              <a
                href={`/papers/${paper.id}`}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-base leading-snug link link-hover"
              >
                #{paper.id} — {paper.title}
              </a>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-base-content/60 mt-1">
                <span className={`badge ${STATUS_BADGE[paper.status] ?? "badge-ghost"}`}>
                  {paper.status.replace("_", " ").toLowerCase()}
                </span>
                {paper.authors.length > 0 && <span>{paper.authors.slice(0, 4).join(", ")}{paper.authors.length > 4 ? " et al." : ""}</span>}
                {paper.year && <span>{paper.year}</span>}
                {paper.venue && <span className="italic">{paper.venue}</span>}
                {paper.doi && (
                  <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer" className="link link-primary">
                    {paper.doi}
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                className="btn btn-success btn-sm text-base"
                disabled={busyId === paper.id || paper.status === "APPROVED" || paper.status === "IMPORTED"}
                onClick={() => decide(paper.id, "APPROVED")}
              >
                Approve
              </button>
              <button
                className="btn btn-error btn-sm text-base"
                disabled={busyId === paper.id || paper.status === "REJECTED"}
                onClick={() => decide(paper.id, "REJECTED")}
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && <span className="text-base text-error">{error}</span>}
    </div>
  )
}
