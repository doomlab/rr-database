// A small "i" icon that explains something on hover/focus. Server-safe: the
// tooltip is pure CSS (daisyUI), so it works in server components too.
export function InfoTip({
  text,
  label = "More info",
  small = false,
}: {
  text: string
  label?: string
  small?: boolean
}) {
  return (
    <span
      className="tooltip tooltip-bottom before:w-72 before:whitespace-normal before:text-left before:text-base"
      data-tip={text}
    >
      <span
        tabIndex={0}
        role="img"
        aria-label={`${label}: ${text}`}
        className={`inline-flex items-center justify-center rounded-full bg-info text-info-content font-bold leading-none cursor-help ${
          small ? "w-5 h-5 text-[13px]" : "w-6 h-6 text-base"
        }`}
      >
        i
      </span>
    </span>
  )
}
