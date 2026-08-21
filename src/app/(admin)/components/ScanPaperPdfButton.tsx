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
  const [scan] = useMutation(scanOpenSciencePracticesForPaper, { throwOnError: false })
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const runScan = async (pdfBase64?: string) => {
    setError(null)
    setIsRunning(true)
    try {
      await scan({ paperId, pdfBase64 })
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Scan failed")
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
    <>
      {hasPdfUrl ? (
        <div className="dropdown">
          <button tabIndex={0} type="button" className="btn btn-info btn-md text-base" disabled={isRunning}>
            {isRunning ? <span className="loading loading-spinner loading-xs" /> : "Scan PDF ▾"}
          </button>
          <ul
            tabIndex={0}
            className="dropdown-content z-20 menu p-2 mt-1 shadow-md bg-base-100 border border-base-300 rounded-lg w-56"
          >
            <li>
              <button type="button" className="text-base" onClick={() => runScan()}>
                Scan stored PDF
              </button>
            </li>
            <li>
              <button type="button" className="text-base" onClick={() => fileInputRef.current?.click()}>
                Upload a PDF instead
              </button>
            </li>
          </ul>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-warning btn-md text-base"
          disabled={isRunning}
          onClick={() => fileInputRef.current?.click()}
        >
          {isRunning ? <span className="loading loading-spinner loading-xs" /> : "Upload PDF to scan"}
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      {error && <span className="basis-full text-base text-error">{error}</span>}
    </>
  )
}
