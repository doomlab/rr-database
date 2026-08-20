"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import scanOpenSciencePractices from "../mutations/scanOpenSciencePractices"

export function ScanOpenSciencePracticesButton() {
  const [scan] = useMutation(scanOpenSciencePractices)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const handleClick = async () => {
    setError(null)
    setIsRunning(true)
    try {
      await scan({})
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Scan failed")
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button className="btn btn-accent btn-sm text-base" disabled={isRunning} onClick={handleClick}>
        {isRunning ? <span className="loading loading-spinner loading-xs" /> : "Scan papers with a PDF"}
      </button>
      {error && <span className="text-base text-error">{error}</span>}
    </div>
  )
}
