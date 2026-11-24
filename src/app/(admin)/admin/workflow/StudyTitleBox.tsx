"use client"

import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/navigation"
import { useState } from "react"
import setStudyTitle from "../../mutations/setStudyTitle"
import { NO_THROW, type GroupStudy } from "./types"
import { LiveBadge } from "./Visibility"

export function StudyTitleBox({ study }: { study: GroupStudy | null }) {
  const [saveTitle] = useMutation(setStudyTitle, NO_THROW)
  const router = useRouter()
  const [titleValue, setTitleValue] = useState(study?.title ?? "")
  const [titleBusy, setTitleBusy] = useState(false)
  const [titleMessage, setTitleMessage] = useState<string | null>(null)

  const updateTitle = async (next: string | null) => {
    if (!study) return
    setTitleMessage(null)
    setTitleBusy(true)
    try {
      await saveTitle({ studyId: study.id, title: next })
      if (next === null) setTitleValue("")
      setTitleMessage(next ? "Title saved." : "Reset to the item's title.")
      router.refresh()
    } catch (e: any) {
      setTitleMessage(e.message ?? "Could not save the title")
    } finally {
      setTitleBusy(false)
    }
  }

  return (
    <div className="rounded-lg bg-base-200 p-4 flex flex-col gap-3">
      <h3 className="font-semibold text-base flex flex-wrap items-center gap-2">
        Study title <LiveBadge />
      </h3>
      {study ? (
        <>
          <p className="text-base text-base-content/60">
            Shown on the study page, the browse list and exports. Leave it blank to use the Stage 1 article's title.
          </p>
          <input
            className="input input-bordered input-sm text-base w-full max-w-3xl"
            placeholder={study.defaultTitle}
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="btn btn-primary btn-sm text-base whitespace-nowrap"
              disabled={titleBusy || !titleValue.trim()}
              onClick={() => updateTitle(titleValue)}
            >
              Save title
            </button>
            {study.title && (
              <button className="btn btn-warning btn-sm text-base whitespace-nowrap" disabled={titleBusy} onClick={() => updateTitle(null)}>
                Reset to default
              </button>
            )}
            {titleMessage && <span className="text-base text-base-content/70">{titleMessage}</span>}
          </div>
        </>
      ) : (
        <p className="text-base text-base-content/60">
          There is no study yet. Save links in the Link step first, then you can set its title here.
        </p>
      )}
    </div>
  )
}
