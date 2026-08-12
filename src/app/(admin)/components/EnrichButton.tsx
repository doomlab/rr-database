"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import enrichFromOpenAlex from "../mutations/enrichFromOpenAlex"

export function EnrichButton({ paperId }: { paperId: number }) {
  const [enrich, { isLoading }] = useMutation(enrichFromOpenAlex)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        className="btn btn-outline btn-sm"
        disabled={isLoading}
        onClick={async () => {
          setError(null)
          try {
            await enrich({ paperId })
            router.refresh()
          } catch (e: any) {
            setError(e.message ?? "Enrichment failed")
          }
        }}
      >
        {isLoading ? <span className="loading loading-spinner loading-xs" /> : "Fill in from OpenAlex"}
      </button>
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  )
}
