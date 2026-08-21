"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import scanOpenSciencePracticesForPaper from "../mutations/scanOpenSciencePracticesForPaper"

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.slice(result.indexOf(",") + 1))
    }
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

export function ScanPaperPdfButton({
  paperId,
  hasPdfUrl,
}: {
  paperId: number
  hasPdfUrl: boolean
}) {
  const [scan] = useMutation(scanOpenSciencePracticesForPaper)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [offerUpload, setOfferUpload] = useState(!hasPdfUrl)

  const runScan = async (pdfBase64?: string) => {
    setError(null)
    setIsRunning(true)
    try {
      await scan({ paperId, pdfBase64 })
      setOfferUpload(false)
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Scan failed")
      // If the stored URL didn't return a real PDF, offer the upload path
      // instead of leaving the admin stuck.
      if (!pdfBase64) setOfferUpload(true)
    } finally {
      setIsRunning(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const base64 = await fileToBase64(file)
    await runScan(base64)
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-2">
        {hasPdfUrl && (
          <button
            type="button"
            className="btn btn-outline btn-md text-base"
            disabled={isRunning}
            onClick={() => runScan()}
          >
            {isRunning ? <span className="loading loading-spinner loading-xs" /> : "Scan PDF for open science links"}
          </button>
        )}
        {offerUpload && (
          <button
            type="button"
            className="btn btn-outline btn-md text-base"
            disabled={isRunning}
            onClick={() => fileInputRef.current?.click()}
          >
            {isRunning ? (
              <span className="loading loading-spinner loading-xs" />
            ) : hasPdfUrl ? (
              "Upload a PDF instead"
            ) : (
              "Upload a PDF to scan for open science links"
            )}
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      {error && <span className="text-base text-error">{error}</span>}
    </div>
  )
}
