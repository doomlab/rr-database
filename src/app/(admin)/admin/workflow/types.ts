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
  metadataVerifiedAt: string | null
}

export type Marker = "DONE" | "LATER" | "QUESTION"

export const MARKER_LABELS: Record<Marker, string> = {
  DONE: "Done",
  LATER: "Later",
  QUESTION: "Question",
}

export const REJECTED_STATUSES = ["REJECTED", "DUPLICATE"]
