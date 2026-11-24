// Marks what a workflow action does to the public site, so admins can tell
// "everyone sees this right away" from "only admins ever see this".
export function LiveBadge({ children = "Live on site" }: { children?: string }) {
  return (
    <span className="badge badge-success whitespace-nowrap" title="Visitors to the public site see this change right away">
      {children}
    </span>
  )
}

export function InternalBadge({ children = "Internal" }: { children?: string }) {
  return (
    <span className="badge badge-neutral whitespace-nowrap" title="Only admins see this; it never appears on the public site">
      {children}
    </span>
  )
}
