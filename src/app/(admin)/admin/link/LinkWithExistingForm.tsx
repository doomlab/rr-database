"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import linkPaperWithExisting from "../../mutations/linkPaperWithExisting"

const ROLE_OPTIONS = [
  { value: "STAGE1_ARTICLE", label: "Stage 1 article" },
  { value: "STAGE1_MATERIALS", label: "Stage 1 materials" },
  { value: "STAGE2_ARTICLE", label: "Stage 2 article" },
  { value: "STAGE2_MATERIALS", label: "Stage 2 materials" },
  { value: "PCIRR_PAGE", label: "PCI RR page" },
  { value: "OTHER", label: "Other" },
] as const

type Role = (typeof ROLE_OPTIONS)[number]["value"]

export function LinkWithExistingForm({
  paperId,
  suggestion,
}: {
  paperId: number
  suggestion?: { id: number; title: string } | null
}) {
  const [targetId, setTargetId] = useState(suggestion ? String(suggestion.id) : "")
  const [role, setRole] = useState<Role>("STAGE1_ARTICLE")
  const [link, { isPending }] = useMutation(linkPaperWithExisting)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleLink = async () => {
    setError(null)
    setSuccess(null)
    const targetPaperId = Number(targetId)
    if (!targetPaperId) {
      setError("Enter a paper ID.")
      return
    }
    try {
      const result = await link({ paperId, role, targetPaperId })
      setSuccess(`Linked with "${result.targetTitle}"`)
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Link failed")
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {suggestion && (
        <p className="text-base text-info">
          This paper cites #{suggestion.id} ("{suggestion.title}"), already in the database — maybe
          its Stage 1/2 counterpart?
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
      <span className="text-base text-base-content/50">No title match found — link with paper #</span>
      <input
        type="number"
        value={targetId}
        onChange={(e) => setTargetId(e.target.value)}
        placeholder="e.g. 1583"
        className="input input-bordered input-sm w-24 text-base"
      />
      <span className="text-base text-base-content/50">as</span>
      <select
        className="select select-bordered select-sm text-base"
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
      >
        {ROLE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <button type="button" className="btn btn-primary btn-sm text-base" disabled={isPending} onClick={handleLink}>
        {isPending ? <span className="loading loading-spinner loading-xs" /> : "Link"}
      </button>
      {success && <span className="text-base text-success">{success}</span>}
      {error && <span className="text-base text-error">{error}</span>}
      </div>
    </div>
  )
}
