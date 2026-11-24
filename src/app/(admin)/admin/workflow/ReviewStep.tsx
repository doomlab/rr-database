"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import reviewPaper from "../../mutations/reviewPaper"
import { NO_THROW, type GroupPaper } from "./types"
import { LiveBadge } from "./Visibility"
import { OpenItemButton } from "./OpenItemButton"


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
      <div className="text-base text-base-content/60">
        <p className="flex flex-wrap items-center gap-2">
          <LiveBadge /> Decide which items are real registered reports.
        </p>
        <ul className="list-disc pl-6 mt-2 flex flex-col gap-1">
          <li>
            <span className="font-semibold">Approve</span> the real registered reports. Approving puts an item on the
            public site straight away.
          </li>
          <li>
            <span className="font-semibold">Reject</span> the rest. Rejecting keeps an item off the public site (it goes
            to the Excluded list under Database) and drops it out of the later steps.
          </li>
          <li>
            If Approve is greyed out, the item is already approved or came from Zotero.
          </li>
          <li>Reject is greyed out once an item has been rejected.</li>
          <li>
            When you're done, click Next step to go to Link.
          </li>
        </ul>
      </div>
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
              <OpenItemButton paper={paper} />
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
