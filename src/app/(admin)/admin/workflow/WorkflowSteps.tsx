"use client"

import { useSearchParams } from "next/navigation"
import { ReviewStep } from "./ReviewStep"
import { LinkStep } from "./LinkStep"
import { EnrichStep } from "./EnrichStep"
import { MetadataStep } from "./MetadataStep"
import { FinishBar } from "./FinishBar"
import { REJECTED_STATUSES, STEP_KEYS, type GroupPaper, type GroupStudy, type Marker } from "./types"

const STEPS = ["Review", "Link", "Enrich", "Metadata"] as const

export function WorkflowSteps({
  papers,
  marker,
  note,
  queueHref,
  study,
  initialStep,
  backBase,
}: {
  papers: GroupPaper[]
  marker: Marker | null
  note: string | null
  queueHref: string
  study: GroupStudy | null
  initialStep: number
  // This group's workflow URL, without a step, for pages that send you back here.
  backBase: string
}) {
  // The step lives in the address, not in component state, so a refresh after
  // an action (or anything else that remounts this) can't send you back to
  // Review. Next keeps useSearchParams in sync with history.replaceState.
  const searchParams = useSearchParams()
  const fromUrl = STEP_KEYS.findIndex((k) => k === searchParams.get("step"))
  const step = fromUrl >= 0 ? fromUrl : initialStep
  const setStep = (next: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set("step", STEP_KEYS[next]!)
    window.history.replaceState(null, "", url)
  }

  // Enrich and Metadata only make sense for papers that survived review.
  const kept = papers.filter((p) => !REJECTED_STATUSES.includes(p.status))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button className="btn btn-secondary btn-sm text-base shrink-0 whitespace-nowrap" disabled={step === 0} onClick={() => setStep(step - 1)}>
          ← Back
        </button>
        <ul className="steps flex-1">
          {STEPS.map((label, i) => (
            <li key={label} className={`step cursor-pointer ${i <= step ? "step-primary" : ""}`} onClick={() => setStep(i)}>
              {label}
            </li>
          ))}
        </ul>
        <button className="btn btn-primary btn-sm text-base shrink-0 whitespace-nowrap" disabled={step === STEPS.length - 1} onClick={() => setStep(step + 1)}>
          Next step →
        </button>
      </div>

      <div>
        {step === 0 && <ReviewStep papers={papers} />}
        {step === 1 && <LinkStep papers={papers} study={study} />}
        {step === 2 && <EnrichStep papers={kept} />}
        {step === 3 && <MetadataStep papers={kept} backHref={`${backBase}&step=metadata`} />}
      </div>

      <FinishBar papers={papers} marker={marker} note={note} queueHref={queueHref} />
    </div>
  )
}
