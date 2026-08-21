"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import resolveReport from "../mutations/resolveReport"
import resolveSuggestion from "../mutations/resolveSuggestion"
import resolveMetadataEdit from "../mutations/resolveMetadataEdit"

const MUTATIONS = {
  report: resolveReport,
  suggestion: resolveSuggestion,
  metadataEdit: resolveMetadataEdit,
} as const

export function ResolveButton({
  mutation,
  input,
  label = "Resolve",
}: {
  mutation: keyof typeof MUTATIONS
  input: Record<string, any>
  label?: string
}) {
  const [run, { isPending }] = useMutation(MUTATIONS[mutation] as any)
  const router = useRouter()
  const [done, setDone] = useState(false)

  if (done) return <span className="text-sm text-base-content/40">Resolved</span>

  return (
    <button
      disabled={isPending}
      onClick={async () => {
        await run(input as any)
        setDone(true)
        router.refresh()
      }}
      className="btn btn-success btn-sm"
    >
      {label}
    </button>
  )
}
