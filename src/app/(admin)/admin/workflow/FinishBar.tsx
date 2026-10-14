"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import type { Route } from "next"
import { useState } from "react"
import setWorkflowMarker from "../../mutations/setWorkflowMarker"
import { MARKER_LABELS, type GroupPaper, type Marker, NO_THROW } from "./types"


export function FinishBar({
  papers,
  marker,
  note: initialNote,
  queueHref,
}: {
  papers: GroupPaper[]
  marker: Marker | null
  note: string | null
  queueHref: string
}) {
  const [mark] = useMutation(setWorkflowMarker, NO_THROW)
  const router = useRouter()
  const [note, setNote] = useState(initialNote ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = papers.filter((p) => !["REJECTED", "DUPLICATE"].includes(p.status))
  const pending = open.filter((p) => p.status === "PENDING_REVIEW").length
  const unverified = open.filter((p) => !p.metadataVerifiedAt).length

  const apply = async (next: Marker | null) => {
    setError(null)
    setBusy(true)
    try {
      await mark({ paperIds: papers.map((p) => p.id), marker: next, note })
      if (next) router.push(queueHref as Route)
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Could not save")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg bg-base-200 p-4 flex flex-col gap-3">
      <h3 className="font-semibold text-base">Finish this group</h3>
      {marker && (
        <p className="text-base">
          Currently marked <span className="badge badge-info">{MARKER_LABELS[marker]}</span>
        </p>
      )}
      {(pending > 0 || unverified > 0) && (
        <p className="text-base text-warning">
          {pending > 0 && `${pending} item${pending === 1 ? " is" : "s are"} still pending review. `}
          {unverified > 0 && `${unverified} not metadata-verified.`}
        </p>
      )}
      <textarea
        className="textarea textarea-bordered text-base w-full"
        rows={2}
        placeholder="Note (what's the question, or why come back later?)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-success btn-sm text-base" disabled={busy} onClick={() => apply("DONE")}>
          Done — next group
        </button>
        <button className="btn btn-warning btn-sm text-base" disabled={busy} onClick={() => apply("LATER")}>
          Later — next group
        </button>
        <button className="btn btn-info btn-sm text-base" disabled={busy} onClick={() => apply("QUESTION")}>
          Question — next group
        </button>
        {marker && (
          <button className="btn btn-secondary btn-sm text-base" disabled={busy} onClick={() => apply(null)}>
            Clear marker
          </button>
        )}
      </div>
      {error && <span className="text-base text-error">{error}</span>}
    </div>
  )
}
