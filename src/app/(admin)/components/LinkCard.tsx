// A card for a page you just go to: title and count on the left, the
// description under them, and the button on the right. No dropdown.
export function LinkCard({
  title,
  description,
  badge,
  href,
  label,
}: {
  title: string
  description: React.ReactNode
  badge?: number
  href: string
  label: string
}) {
  return (
    <div className="card bg-base-200 shadow-sm w-full">
      <div className="card-body flex-row items-center justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {badge !== undefined && badge > 0 && <span className="badge badge-warning">{badge}</span>}
            <h2 className="text-xl font-semibold">{title}</h2>
          </div>
          <p className="text-base text-base-content/60 mt-1">{description}</p>
        </div>
        <a href={href} className="btn btn-primary btn-sm text-base shrink-0 whitespace-nowrap">
          {label}
        </a>
      </div>
    </div>
  )
}
