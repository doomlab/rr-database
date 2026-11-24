"use client"

import { useState } from "react"
import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import restorePaper from "../(admin)/mutations/restorePaper"
import rejectStudy from "../(admin)/mutations/rejectStudy"
import { ButtonTip } from "./ButtonTip"
import { NO_THROW } from "src/lib/mutationOptions"

// Admin buttons for an excluded item: bring it back, either straight to
// approved or to the review queue to be decided again.
export function RestorePaperButtons({ paperId }: { paperId: number }) {
  const [restore] = useMutation(restorePaper, NO_THROW)
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (to: "PENDING_REVIEW" | "APPROVED") => {
    setError(null)
    setBusy(true)
    try {
      await restore({ paperId, to })
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Could not restore")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ButtonTip tip="Put this item back in the review queue to be decided again">
        <button type="button" className="btn btn-warning btn-md text-base" disabled={busy} onClick={() => run("PENDING_REVIEW")}>
          Restore to queue
        </button>
      </ButtonTip>
      <ButtonTip tip="Approve this item and put it back on the public site">
        <button type="button" className="btn btn-success btn-md text-base" disabled={busy} onClick={() => run("APPROVED")}>
          Restore and approve
        </button>
      </ButtonTip>
      {error && <span className="text-base text-error">{error}</span>}
    </>
  )
}

// Admin button on a study page: reject every item in the study at once.
export function RejectStudyButton({ studyId, itemCount }: { studyId: number; itemCount: number }) {
  const [reject] = useMutation(rejectStudy, NO_THROW)
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    const note = window.prompt(
      `Reject this whole study (${itemCount} item${itemCount === 1 ? "" : "s"})? They move to the Excluded list and the study leaves the public site. Nothing is deleted.\n\nOptional reason (leave blank for none), then OK to confirm:`
    )
    if (note === null) return
    setError(null)
    setBusy(true)
    try {
      await reject({ studyId, reviewNote: note || undefined })
      router.push("/")
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Could not reject the study")
      setBusy(false)
    }
  }

  return (
    <>
      <ButtonTip tip="Reject every item in this study and remove it from the public site (nothing is deleted)">
        <button type="button" className="btn btn-error btn-md text-base" disabled={busy} onClick={run}>
          Reject study
        </button>
      </ButtonTip>
      {error && <span className="text-base text-error">{error}</span>}
    </>
  )
}
