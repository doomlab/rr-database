"use client"

import { useRouter } from "next/navigation"

// "Back" link that returns to wherever the visitor came from (a filtered
// browse, a search, another study) when they arrived from elsewhere on this
// site. With no such history (a pasted link, a new tab, another site) it falls
// back to `fallbackHref`, so it always goes somewhere sensible.
export function BackLink({ fallbackHref, children }: { fallbackHref: string; children: React.ReactNode }) {
  const router = useRouter()

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Let ctrl/cmd/middle-click open the fallback in a new tab as usual.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    let cameFromHere = false
    try {
      cameFromHere = !!document.referrer && new URL(document.referrer).origin === window.location.origin
    } catch {
      // unparseable referrer — use the fallback
    }
    if (cameFromHere && window.history.length > 1) {
      e.preventDefault()
      router.back()
    }
  }

  return (
    <a
      href={fallbackHref}
      onClick={handleClick}
      className="text-sm text-base-content/50 hover:text-base-content mb-6 inline-block"
    >
      {children}
    </a>
  )
}
