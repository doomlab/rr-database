// The real StudyPaper roles a paper can be tagged with — shared between the
// Link papers page and the per-paper role editor on the paper's own page.
export const STUDY_PAPER_ROLE_OPTIONS = [
  { value: "STAGE1_ARTICLE", label: "Stage 1 article" },
  { value: "STAGE1_MATERIALS", label: "Stage 1 materials" },
  { value: "STAGE2_ARTICLE", label: "Stage 2 article" },
  { value: "STAGE2_MATERIALS", label: "Stage 2 materials" },
  { value: "PCIRR_PAGE", label: "PCI RR page" },
  { value: "OTHER", label: "Other" },
] as const

export const STUDY_PAPER_ROLE_VALUES = STUDY_PAPER_ROLE_OPTIONS.map((o) => o.value) as [
  (typeof STUDY_PAPER_ROLE_OPTIONS)[number]["value"],
  ...(typeof STUDY_PAPER_ROLE_OPTIONS)[number]["value"][],
]

export const STUDY_PAPER_ROLE_LABELS: Record<string, string> = Object.fromEntries(
  STUDY_PAPER_ROLE_OPTIONS.map((o) => [o.value, o.label])
)
