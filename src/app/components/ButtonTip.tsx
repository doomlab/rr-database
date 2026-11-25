import type { ReactNode } from "react"

// Hover/focus tooltip for a button, so labels can stay short. Pure CSS
// (daisyUI), so it works in server and client components alike.
export function ButtonTip({ tip, children }: { tip: string; children: ReactNode }) {
  return (
    <span
      className="tooltip before:w-64 before:whitespace-normal before:text-left before:text-base"
      data-tip={tip}
    >
      {children}
    </span>
  )
}
