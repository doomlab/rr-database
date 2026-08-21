// The JMIR-specific "timing of registration" badge designations from the
// tagging doc, shared between the dedicated JmirBadgeButton flow and the
// general metadata edit/verify forms so both offer the same options.
export const JMIR_BADGE_OPTIONS = [
  { value: "DE_DATA_EXISTING", label: "DE: Data Existing" },
  { value: "PRE_REGISTERED", label: "PRE-registered" },
  { value: "REGISTERED", label: "Registered" },
  { value: "POST", label: "POST" },
  { value: "STAGE2_ONLY", label: "Stage 2 Only" },
  { value: "STAGE1_ONLY", label: "Stage 1 Only" },
  { value: "NONE_FOUND", label: "No badge found" },
] as const

export const JMIR_BADGE_TYPES = JMIR_BADGE_OPTIONS.map((o) => o.value) as [
  (typeof JMIR_BADGE_OPTIONS)[number]["value"],
  ...(typeof JMIR_BADGE_OPTIONS)[number]["value"][],
]

export type JmirBadgeType = (typeof JMIR_BADGE_OPTIONS)[number]["value"]
