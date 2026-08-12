"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import reviewPaper from "../mutations/reviewPaper"

export function PaperReviewActions({ paperId }: { paperId: number }) {
  const [review, { isLoading }] = useMutation(reviewPaper)
  const router = useRouter()
  const [done, setDone] = useState(false)

  const decide = async (decision: "APPROVED" | "REJECTED") => {
    await review({ paperId, decision })
    setDone(true)
    router.refresh()
  }

  if (done) return <span className="text-sm text-base-content/40">Updated</span>

  return (
    <div className="flex gap-2 shrink-0">
      <button
        disabled={isLoading}
        onClick={() => decide("APPROVED")}
        className="btn btn-success btn-sm"
      >
        Approve
      </button>
      <button
        disabled={isLoading}
        onClick={() => decide("REJECTED")}
        className="btn btn-error btn-sm btn-outline"
      >
        Reject
      </button>
    </div>
  )
}
