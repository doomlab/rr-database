"use client"

import { useState } from "react"
import { ReviewStep } from "./ReviewStep"
import { LinkStep } from "./LinkStep"
import { EnrichStep } from "./EnrichStep"
import { MetadataStep } from "./MetadataStep"
import { FinishBar } from "./FinishBar"
import { REJECTED_STATUSES, type GroupPaper, type Marker } from "./types"

const STEPS = ["Review", "Link", "Enrich", "Metadata"] as const

export function WorkflowSteps({
  papers,
  marker,
  note,
  queueHref,
}: {
  papers: GroupPaper[]
  marker: Marker | null
  note: string | null
  queueHref: string
}) {
  const [step, setStep] = useState(0)
  // Enrich and Metadata only make sense for papers that survived review.
  const kept = papers.filter((p) => !REJECTED_STATUSES.includes(p.status))

  return (
    <div className="flex flex-col gap-6">
      <ul className="steps w-full">
        {STEPS.map((label, i) => (
          <li key={label} className={`step cursor-pointer ${i <= step ? "step-primary" : ""}`} onClick={() => setStep(i)}>
            {label}
          </li>
        ))}
      </ul>

      <div>
        {step === 0 && <ReviewStep papers={papers} />}
        {step === 1 && <LinkStep papers={papers} />}
        {step === 2 && <EnrichStep papers={kept} />}
        {step === 3 && <MetadataStep papers={kept} />}
      </div>

      <div className="flex items-center gap-2">
        <button className="btn btn-neutral btn-sm text-base" disabled={step === 0} onClick={() => setStep(step - 1)}>
          ← Back
        </button>
        <button className="btn btn-primary btn-sm text-base" disabled={step === STEPS.length - 1} onClick={() => setStep(step + 1)}>
          Next step →
        </button>
      </div>

      <FinishBar papers={papers} marker={marker} note={note} queueHref={queueHref} />
    </div>
  )
}
