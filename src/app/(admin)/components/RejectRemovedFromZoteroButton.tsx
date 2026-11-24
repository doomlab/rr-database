"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import rejectRemovedFromZotero from "../mutations/rejectRemovedFromZotero"
import { NO_THROW } from "src/lib/mutationOptions"

type Result = Awaited<ReturnType<typeof rejectRemovedFromZotero>>

// Two steps on purpose: preview what would be excluded, then confirm.
export function RejectRemovedFromZoteroButton() {
  const [run, { isPending }] = useMutation(rejectRemovedFromZotero, NO_THROW)
  const router = useRouter()
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)

  const go = async (dryRun: boolean) => {
    setError(null)
    try {
      setResult(await run({ dryRun }))
      if (!dryRun) router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Could not check Zotero")
    }
  }

  const canConfirm = result?.dryRun && result.count > 0

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex items-center gap-2">
        <button className="btn btn-primary btn-sm text-base" disabled={isPending} onClick={() => go(true)}>
          {isPending ? <span className="loading loading-spinner loading-xs" /> : "Preview what was removed"}
        </button>
        {canConfirm && (
          <button className="btn btn-error btn-sm text-base" disabled={isPending} onClick={() => go(false)}>
            Exclude these {result.count} items
          </button>
        )}
      </div>
      {result && (
        <div className="text-base">
          <p>
            {result.dryRun
              ? `Zotero has ${result.zoteroCount} items. ${result.count} items on the site are no longer in it.`
              : `Excluded ${result.count} items that are no longer in Zotero.`}
          </p>
          {result.dryRun && result.preview.length > 0 && (
            <ul className="list-disc pl-6 text-base-content/70">
              {result.preview.map((t) => (
                <li key={t}>{t}</li>
              ))}
              {result.count > result.preview.length && <li>…and {result.count - result.preview.length} more</li>}
            </ul>
          )}
        </div>
      )}
      {error && <span className="text-base text-error">{error}</span>}
    </div>
  )
}
