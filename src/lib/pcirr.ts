// Peer Community In Registered Reports (PCI RR) publishes several documents
// per study under one DOI stem: the recommendation itself
// (10.24072/pci.rr.<id>), plus reviews (.rev<n>), author responses (.ar<n>),
// and decisions (.d<n>) as suffixed DOIs. All of it shows up in OpenAlex
// under one source, so a "pull by year" run mixes actual Registered Report
// articles in with PCI's own commentary on them.

import { StudyPaperRole } from "db"
import { findMatchingPaper } from "./duplicateClusters"

export const PCIRR_SOURCE_NAME = "Peer Community In Registered Reports"
export const PCIRR_DOI_PREFIX = "10.24072/pci.rr."

export function isPcirrWork(doi: string | null, venue: string | null): boolean {
  if (venue === PCIRR_SOURCE_NAME) return true
  return !!doi && doi.toLowerCase().startsWith(PCIRR_DOI_PREFIX)
}

const TITLE_PREFIXES: [RegExp, StudyPaperRole][] = [
  [/^recommendation of:\s*/i, StudyPaperRole.PCIRR_PAGE],
  [/^review of:\s*/i, StudyPaperRole.PCIRR_REVIEW],
  [/^author response of:\s*/i, StudyPaperRole.PCIRR_AUTHOR_RESPONSE],
  [/^decision[^:]*:\s*/i, StudyPaperRole.PCIRR_DECISION],
]

export type PcirrDocument = {
  role: StudyPaperRole
  // The underlying study's title, with PCI's "Review of:"/"Round#3" framing
  // stripped off, for matching against the original paper already in the DB.
  strippedTitle: string
}

// Only PCI's own commentary documents get a role here — an OpenAlex work
// from the PCI RR source with none of these title prefixes is the actual
// Registered Report article itself (PCI mirrors/hosts it), not a document to
// link onto an existing study.
export function detectPcirrDocument(title: string): PcirrDocument | null {
  for (const [prefix, role] of TITLE_PREFIXES) {
    if (prefix.test(title)) {
      const strippedTitle = title.replace(prefix, "").replace(/\.?\s*round\s*#?\d+\s*$/i, "").trim()
      return { role, strippedTitle }
    }
  }
  return null
}

