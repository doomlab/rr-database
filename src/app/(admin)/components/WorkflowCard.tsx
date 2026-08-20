"use client"

import { useState } from "react"

export function WorkflowCard({
  title,
  description,
  defaultOpen = true,
  children,
}: {
  title: string
  description: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="card bg-base-200 shadow-sm w-full">
      <div className="card-body gap-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-start gap-3 text-left"
        >
          <span
            className={`text-xl leading-tight text-base-content/50 transition-transform shrink-0 ${
              open ? "rotate-90" : ""
            }`}
          >
            ›
          </span>
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-base text-base-content/60 mt-1">{description}</p>
          </div>
        </button>
        {open && <div>{children}</div>}
      </div>
    </div>
  )
}
