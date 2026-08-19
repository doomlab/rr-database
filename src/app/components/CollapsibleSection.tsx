"use client"

import { useState } from "react"

export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-base-content/40 hover:text-base-content/70"
      >
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>›</span>
        {title}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  )
}
