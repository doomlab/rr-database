"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import updatePaperRole from "../(admin)/mutations/updatePaperRole"
import { STUDY_PAPER_ROLE_OPTIONS } from "src/lib/studyPaperRoles"

export function PaperRoleSelect({
  paperId,
  currentRole,
}: {
  paperId: number
  currentRole: string | null
}) {
  const [update, { isPending }] = useMutation(updatePaperRole)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    setError(null)
    try {
      await update({ paperId, role: e.target.value as any })
      router.refresh()
    } catch (err: any) {
      setError(err.message ?? "Failed to update role")
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-base text-base-content/60">Role in study</span>
      <select
        className="select select-bordered select-sm text-base"
        value={currentRole ?? "OTHER"}
        onChange={handleChange}
        disabled={isPending}
      >
        {STUDY_PAPER_ROLE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {isPending && <span className="loading loading-spinner loading-xs" />}
      {error && <span className="text-base text-error">{error}</span>}
    </div>
  )
}
