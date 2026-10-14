// Plain, serializable shape of a paper in the workflow — what the server
// page hands to the client step components.
export type GroupPaper = {
  id: number
  title: string
  year: number | null
  venue: string | null
  doi: string | null
  url: string | null
  status: string
  stage: "STAGE_1" | "STAGE_2" | null
  authors: string[]
  studyId: number | null
  role: string | null
  pcirrRole: string | null
  openAlexFetchedAt: string | null
  crossrefQueried: boolean
  crossrefFound: boolean
  // Crossref has no timestamp column, so this is the latest "crossref" entry
  // in the paper's edit history.
  crossrefPulledAt: string | null
  metadataVerifiedAt: string | null
}

export type Marker = "DONE" | "LATER" | "QUESTION"

export const MARKER_LABELS: Record<Marker, string> = {
  DONE: "Done",
  LATER: "Later",
  QUESTION: "Question",
}

export const REJECTED_STATUSES = ["REJECTED", "DUPLICATE"]

export { NO_THROW } from "src/lib/mutationOptions"

export const STEP_KEYS = ["review", "link", "enrich", "metadata"] as const
export type StepKey = (typeof STEP_KEYS)[number]

// The group's study, if its papers are linked into one.
export type GroupStudy = { id: number; title: string | null; defaultTitle: string }
