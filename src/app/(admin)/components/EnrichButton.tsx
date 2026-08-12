"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import enrichFromOpenAlex from "../mutations/enrichFromOpenAlex"
import enrichFromCrossref from "../mutations/enrichFromCrossref"

const MUTATIONS = {
  openalex: enrichFromOpenAlex,
  crossref: enrichFromCrossref,
} as const

export function EnrichButton({
  paperId,
  source,
  label,
}: {
  paperId: number
  source: keyof typeof MUTATIONS
  label: string
}) {
  const [enrich, { isLoading }] = useMutation(MUTATIONS[source])
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
        {isLoading ? <span className="loading loading-spinner loading-xs" /> : label}
      </button>
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  )
}
