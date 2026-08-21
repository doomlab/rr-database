"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import bulkReviewPapers from "../../mutations/bulkReviewPapers"

export function BulkRejectButton({ paperIds }: { paperIds: number[] }) {
  const [bulkReview] = useMutation(bulkReviewPapers)
  const [pending, setPending] = useState(false)
  const router = useRouter()

  const rejectAll = async () => {
    if (!confirm(`Reject all ${paperIds.length} of these as duplicates/noise?`)) return
    setPending(true)
    await bulkReview({ paperIds, decision: "REJECTED" })
    router.refresh()
  }

  return (
    <button className="btn btn-error btn-sm" disabled={pending} onClick={rejectAll}>
      Reject all {paperIds.length}
    </button>
  )
}
