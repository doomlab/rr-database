"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export type PreviewResult = { dryRun: boolean; count: number; message: string; preview: string[] }

// A clean-up tool in two steps: preview what would change, then confirm. The
// title and description are on the left, the buttons on the right, and the
// preview list underneath. Without a title it is just the buttons and results,
// for use inside another card.
export function PreviewConfirmCard({
  title,
  description,
  previewLabel,
  confirmLabel,
  run,
}: {
  title?: string
  description?: string
  previewLabel: string
  confirmLabel: (count: number) => string
  run: (dryRun: boolean) => Promise<PreviewResult>
}) {
  const router = useRouter()
  const [result, setResult] = useState<PreviewResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const go = async (dryRun: boolean) => {
    setError(null)
    setBusy(true)
    try {
      setResult(await run(dryRun))
      if (!dryRun) router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  const canConfirm = result?.dryRun && result.count > 0

  const buttons = (
    <div className="flex items-center gap-2 shrink-0">
      <button className="btn btn-primary btn-sm text-base" disabled={busy} onClick={() => go(true)}>
        {busy ? <span className="loading loading-spinner loading-xs" /> : previewLabel}
      </button>
      {canConfirm && (
        <button className="btn btn-error btn-sm text-base" disabled={busy} onClick={() => go(false)}>
          {confirmLabel(result.count)}
        </button>
      )}
    </div>
  )

  const results = (
    <>
      {result && (
        <div className="text-base">
          <p>{result.message}</p>
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
    </>
  )

  if (!title) {
    return (
      <div className="flex flex-col items-start gap-3">
        {buttons}
        {results}
      </div>
    )
  }

  return (
    <div className="card bg-base-200 shadow-sm w-full">
      <div className="card-body gap-4">
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-base text-base-content/60 mt-1">{description}</p>
          </div>
          {buttons}
        </div>
        {results}
      </div>
    </div>
  )
}
