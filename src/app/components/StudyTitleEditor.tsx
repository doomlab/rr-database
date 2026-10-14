"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import setStudyTitle from "../(admin)/mutations/setStudyTitle"
import { NO_THROW } from "src/lib/mutationOptions"

// The study page heading for admins: shows the title with an Edit button, and
// lets them type a custom one or reset to the paper-derived default.
export function StudyTitleEditor({
  studyId,
  title,
  hasCustomTitle,
}: {
  studyId: number
  title: string
  hasCustomTitle: boolean
}) {
  const [save] = useMutation(setStudyTitle, NO_THROW)
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (next: string | null) => {
    setError(null)
    setBusy(true)
    try {
      await save({ studyId, title: next })
      setEditing(false)
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Could not save the title")
    } finally {
      setBusy(false)
    }
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-2 min-w-0">
        <h1 className="text-3xl font-bold leading-snug">{title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="btn btn-accent btn-sm text-base"
            onClick={() => {
              setValue(title)
              setEditing(true)
            }}
          >
            Edit title
          </button>
          {hasCustomTitle && <span className="badge badge-info">custom title</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 min-w-0 flex-1">
      <textarea
        className="textarea textarea-bordered text-2xl font-bold leading-snug w-full"
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-primary btn-sm text-base" disabled={busy || !value.trim()} onClick={() => run(value)}>
          {busy ? <span className="loading loading-spinner loading-xs" /> : "Save title"}
        </button>
        {hasCustomTitle && (
          <button className="btn btn-warning btn-sm text-base" disabled={busy} onClick={() => run(null)}>
            Reset to the paper's title
          </button>
        )}
        <button className="btn btn-secondary btn-sm text-base" disabled={busy} onClick={() => setEditing(false)}>
          Cancel
        </button>
        {error && <span className="text-base text-error">{error}</span>}
      </div>
    </div>
  )
}
