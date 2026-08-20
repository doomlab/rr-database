export function humanizeItemType(itemType: string | null): string | undefined {
  if (!itemType) return undefined
  const words = itemType
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
  return words.map((w) => w[0]!.toUpperCase() + w.slice(1)).join(" ")
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function hrefFor(value: string): string | null {
  if (value.startsWith("http://") || value.startsWith("https://")) return value
  if (/^10\.\d{4,9}\/\S+$/.test(value)) return `https://doi.org/${value}`
  return null
}

export function Row({ label, value, italic }: { label: string; value?: string; italic?: boolean }) {
  if (!value) return null
  const href = hrefFor(value)
  return (
    <div className="flex gap-3 py-1.5">
      <span className="w-32 shrink-0 font-medium text-base-content/70">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`link link-primary break-all ${italic ? "italic" : ""}`}
        >
          {value}
        </a>
      ) : (
        <span className={`text-base-content/80 ${italic ? "italic" : ""}`}>{value}</span>
      )}
    </div>
  )
}
