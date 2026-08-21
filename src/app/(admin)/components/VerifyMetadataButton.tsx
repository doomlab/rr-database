"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import verifyPaperMetadata from "../mutations/verifyPaperMetadata"

export function VerifyMetadataButton({ paperId }: { paperId: number }) {
  const [verify, { isPending }] = useMutation(verifyPaperMetadata)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setError(null)
    try {
      await verify({ paperId })
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Save failed")
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" className="btn btn-success btn-md text-base" disabled={isPending} onClick={handleClick}>
        {isPending ? <span className="loading loading-spinner loading-xs" /> : "Mark metadata verified"}
      </button>
      {error && <span className="text-base text-error">{error}</span>}
    </div>
  )
}
