"use client"

import { useState } from "react"

export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string
  subtitle?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-baseline gap-1.5 text-sm font-semibold uppercase tracking-wider text-base-content/60 hover:text-base-content"
      >
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>›</span>
        {title}
        {subtitle && <span className="font-normal normal-case text-base-content/50">{subtitle}</span>}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  )
}
