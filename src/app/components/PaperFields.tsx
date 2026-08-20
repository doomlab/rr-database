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

export function Row({ label, value, italic }: { label: string; value?: string; italic?: boolean }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-1.5">
      <span className="w-32 shrink-0 font-medium text-base-content/70">{label}</span>
      <span className={`text-base-content/80 ${italic ? "italic" : ""}`}>{value}</span>
    </div>
  )
}
