"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import runZoteroImport from "../mutations/runZoteroImport"

export function RunImportButton({
  target,
  label,
}: {
  target: "production" | "stagingCollections"
  label: string
}) {
  const [run, { isLoading }] = useMutation(runZoteroImport)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        className="btn btn-primary btn-sm"
        disabled={isLoading}
        onClick={async () => {
          setError(null)
          try {
            await run({ target })
            router.refresh()
          } catch (e: any) {
            setError(e.message ?? "Import failed")
          }
        }}
      >
        {isLoading ? <span className="loading loading-spinner loading-xs" /> : label}
      </button>
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  )
}
