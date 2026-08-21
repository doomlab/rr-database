"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import saveJmirBadge from "../mutations/saveJmirBadge"
import { JMIR_BADGE_OPTIONS as BADGE_OPTIONS, type JmirBadgeType as BadgeType } from "src/lib/jmirBadgeOptions"

export function JmirBadgeButton({
  paperId,
  alreadyChecked,
}: {
  paperId: number
  alreadyChecked: boolean
}) {
  const [open, setOpen] = useState(false)
  const [badgeType, setBadgeType] = useState<BadgeType>("REGISTERED")
  const [doi, setDoi] = useState("")
  const [save, { isPending }] = useMutation(saveJmirBadge)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  if (!open) {
    return (
      <button type="button" className="btn btn-outline btn-secondary btn-md text-base" onClick={() => setOpen(true)}>
        {alreadyChecked ? "Edit JMIR badge info" : "Get JMIR info"}
      </button>
    )
  }

  const handleSave = async () => {
    setError(null)
    setResult(null)
    try {
      const res = await save({ paperId, badgeType, counterpartDoi: doi.trim() || undefined })
      if (res.linked) {
        setResult(
          res.created
            ? `Linked with newly-added paper "${res.counterpartTitle}".`
            : `Linked with existing paper "${res.counterpartTitle}".`
        )
      } else {
        setResult("Saved.")
      }
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Save failed")
    }
  }

  return (
    <div className="border border-base-300 rounded-lg p-3 flex flex-col gap-2 w-full max-w-md">
      <div className="flex items-center gap-2">
        <span className="text-base text-base-content/60 shrink-0">Badge</span>
        <select
          className="select select-bordered select-sm text-base"
          value={badgeType}
          onChange={(e) => setBadgeType(e.target.value as BadgeType)}
        >
          {BADGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-base text-base-content/60 shrink-0">Counterpart DOI</span>
        <input
          type="text"
          value={doi}
          onChange={(e) => setDoi(e.target.value)}
          placeholder="10.2196/…"
          className="input input-bordered input-sm text-base flex-1"
        />
      </div>
      <p className="text-base text-base-content/50">
        If the badge links to a DOI, paste it here — we'll link that paper (adding it first if it's
        not already in the database).
      </p>
      <div className="flex items-center gap-3">
        <button type="button" className="btn btn-primary btn-sm text-base" disabled={isPending} onClick={handleSave}>
          {isPending ? <span className="loading loading-spinner loading-xs" /> : "Save"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm text-base" onClick={() => setOpen(false)}>
          Cancel
        </button>
        {result && <span className="text-base text-success">{result}</span>}
        {error && <span className="text-base text-error">{error}</span>}
      </div>
    </div>
  )
}
