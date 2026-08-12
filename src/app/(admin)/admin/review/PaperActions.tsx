"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import type { Route } from "next"
import reviewPaper from "../../mutations/reviewPaper"

export function PaperActions({ paperId, nextHref }: { paperId: number; nextHref: string }) {
  const [review] = useMutation(reviewPaper)
  const router = useRouter()

  const decide = async (decision: "APPROVED" | "REJECTED") => {
    await review({ paperId, decision })
    router.push(nextHref as Route)
    router.refresh()
  }

  return (
    <div className="flex gap-4 justify-center">
      <button className="btn btn-success btn-wide" onClick={() => decide("APPROVED")}>
        Approve
      </button>
      <button className="btn btn-error btn-wide" onClick={() => decide("REJECTED")}>
        Reject
      </button>
      <a href={nextHref} className="btn btn-ghost btn-outline">
        Skip →
      </a>
    </div>
  )
}
