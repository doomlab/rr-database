"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import reviewPaper from "../../mutations/reviewPaper"
import { NO_THROW, REJECTED_STATUSES, type GroupPaper } from "./types"
import { LiveBadge } from "./Visibility"


const STATUS_BADGE: Record<string, string> = {
  PENDING_REVIEW: "badge-warning",
  APPROVED: "badge-success",
  IMPORTED: "badge-info",
  REJECTED: "badge-error",
  DUPLICATE: "badge-neutral",
}

// IMPORTED only means the item came in through a Zotero sync, so say that.
const STATUS_LABEL: Record<string, string> = {
  PENDING_REVIEW: "Pending",
  APPROVED: "Approved",
  IMPORTED: "From Zotero",
  REJECTED: "Excluded",
  DUPLICATE: "Duplicate",
}

// onDone fires once every item has been decided and at least one was kept, so the
// workflow moves on to Link by itself.
export function ReviewStep({ papers, onDone }: { papers: GroupPaper[]; onDone?: () => void }) {
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
      const others = papers.filter((p) => p.id !== paperId)
      const stillPending = others.some((p) => p.status === "PENDING_REVIEW")
      const keptCount = others.filter((p) => !REJECTED_STATUSES.includes(p.status)).length + (decision === "APPROVED" ? 1 : 0)
      if (!stillPending && keptCount > 0) onDone?.()
    } catch (e: any) {
      setError(e.message ?? "Could not save the decision")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base text-base-content/60 flex flex-wrap items-center gap-2">
        <LiveBadge /> Approve the items that are real registered reports and reject the rest.
        Approving puts an item on the public site straight away; rejecting keeps it off the main
        list. Rejected items drop out of the later steps, and once every item is decided you move
        on to Link automatically.
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
                  {STATUS_LABEL[paper.status] ?? paper.status}
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
