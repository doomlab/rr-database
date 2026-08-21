"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import scanOpenSciencePracticesForPaper from "../mutations/scanOpenSciencePracticesForPaper"

export function ScanPaperPdfButton({ paperId }: { paperId: number }) {
  const [scan] = useMutation(scanOpenSciencePracticesForPaper)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const handleClick = async () => {
    setError(null)
    setIsRunning(true)
    try {
      await scan({ paperId })
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Scan failed")
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        className="btn btn-outline btn-md text-base"
        disabled={isRunning}
        onClick={handleClick}
      >
        {isRunning ? <span className="loading loading-spinner loading-xs" /> : "Scan PDF for open science links"}
      </button>
      {error && <span className="text-base text-error">{error}</span>}
    </div>
  )
}
