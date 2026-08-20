export function KeywordBadges({
  keywords,
  basePath,
  activeKeyword,
}: {
  keywords: string[]
  basePath: string
  activeKeyword?: string
}) {
  if (keywords.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {keywords.map((kw) => (
        <a
          key={kw}
          href={`${basePath}?keyword=${encodeURIComponent(kw)}`}
          className={`badge badge-sm ${kw === activeKeyword ? "badge-primary" : "badge-outline"}`}
        >
          {kw}
        </a>
      ))}
    </div>
  )
}
