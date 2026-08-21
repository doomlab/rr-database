// Groups papers that are probably the same underlying work (e.g. OpenAlex
// indexing a preprint, the published article, and a Zenodo/OSF registration
// as separate records) so an admin can link them into one Study, or mark the
// extras as duplicates of a chosen canonical paper.

import db from "db"

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "into", "onto", "over", "under",
  "about", "across", "after", "before", "between", "during", "without",
  "study", "studies", "analysis", "effect", "effects", "using", "based",
])

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function significantWords(normalized: string): Set<string> {
  return new Set(normalized.split(" ").filter((w) => w.length >= 4 && !STOPWORDS.has(w)))
}

function diceCoefficient(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const w of a) if (b.has(w)) intersection++
  return (2 * intersection) / (a.size + b.size)
}

const SIMILARITY_THRESHOLD = 0.6

// Short titles have too few significant words for the Dice ratio to be
// reliable — two unrelated papers sharing just 2-3 generic on-topic words
// (e.g. "covid vaccine trial") can already clear 0.6. Require a
// progressively stricter ratio the fewer significant words either title has,
// so short titles only cluster when they're near-identical.
function requiredThreshold(sizeA: number, sizeB: number): number {
  const minSize = Math.min(sizeA, sizeB)
  if (minSize <= 2) return 0.9
  if (minSize <= 4) return 0.75
  return SIMILARITY_THRESHOLD
}

export type ClusterablePaper = {
  id: number
  title: string
}

// Almost every paper in this database already has its own solo, 1-paper
// Study — leftover from an old schema migration, not a real Stage 1/Stage 2
// link. A paper only counts as "actually linked" once its Study has more
// than one paper in it; anything else (no Study, or a solo Study) is still
// fair game to group and link.
export const LINK_ELIGIBLE_STATUSES = ["PENDING_REVIEW", "IMPORTED", "APPROVED"] as const

export type LinkEligibilityPaper = {
  status: string
  canonicalPaperId: number | null
  studyPaper: { study: { _count: { papers: number } } } | null
}

export function isLinkEligible(paper: LinkEligibilityPaper): boolean {
  if (paper.canonicalPaperId != null) return false
  if (!(LINK_ELIGIBLE_STATUSES as readonly string[]).includes(paper.status)) return false
  return !paper.studyPaper || paper.studyPaper.study._count.papers <= 1
}

// minGroupSize: 2 (default) returns only title-matched groups, like before.
// Pass 1 to also get back every leftover paper that didn't match anyone
// else, each as its own singleton group — used to surface "no automatic
// match found" papers so they can still be linked manually.
export function clusterPapersByTitle<T extends ClusterablePaper>(
  papers: T[],
  minGroupSize: number = 2
): T[][] {
  const words = new Map<number, Set<string>>()
  const wordIndex = new Map<string, number[]>()

  for (const paper of papers) {
    const w = significantWords(normalizeTitle(paper.title))
    words.set(paper.id, w)
    for (const word of w) {
      const bucket = wordIndex.get(word)
      if (bucket) bucket.push(paper.id)
      else wordIndex.set(word, [paper.id])
    }
  }

  // Union-find over papers that share enough significant words.
  const parent = new Map<number, number>()
  const find = (id: number): number => {
    let root = id
    while (parent.get(root) !== undefined && parent.get(root) !== root) root = parent.get(root)!
    parent.set(id, root)
    return root
  }
  const union = (a: number, b: number) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }
  for (const paper of papers) parent.set(paper.id, paper.id)

  for (const paper of papers) {
    const paperWords = words.get(paper.id)!
    const candidateIds = new Set<number>()
    for (const word of paperWords) {
      for (const otherId of wordIndex.get(word) ?? []) {
        if (otherId !== paper.id) candidateIds.add(otherId)
      }
    }
    for (const otherId of candidateIds) {
      const otherWords = words.get(otherId)!
      const threshold = requiredThreshold(paperWords.size, otherWords.size)
      if (diceCoefficient(paperWords, otherWords) >= threshold) {
        union(paper.id, otherId)
      }
    }
  }

  const groups = new Map<number, T[]>()
  for (const paper of papers) {
    const root = find(paper.id)
    const group = groups.get(root)
    if (group) group.push(paper)
    else groups.set(root, [paper])
  }

  return Array.from(groups.values())
    .filter((g) => g.length >= minGroupSize)
    .sort((a, b) => b.length - a.length)
}

// Finds the single best title match for `title` among `candidates`, if any
// candidate clears the same short-title-aware threshold used by
// clusterPapersByTitle. Returns null if nothing clears the threshold, or if
// the top two candidates are too close to call (ambiguous match).
export function bestTitleMatch<T extends ClusterablePaper>(title: string, candidates: T[]): T | null {
  const targetWords = significantWords(normalizeTitle(title))
  if (targetWords.size === 0) return null

  const scored = candidates
    .map((c) => ({
      candidate: c,
      score: diceCoefficient(targetWords, significantWords(normalizeTitle(c.title))),
      threshold: requiredThreshold(targetWords.size, significantWords(normalizeTitle(c.title)).size),
    }))
    .filter((s) => s.score >= s.threshold)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) return null
  if (scored.length > 1 && scored[1]!.score >= scored[0]!.score - 0.05) return null
  return scored[0]!.candidate
}

// Looks for an existing paper whose title matches `title` closely enough to
// be confident it's the same underlying work — scoped to a small candidate
// set (papers sharing a distinctive significant word) rather than loading
// the whole table. Used to avoid re-discovering a paper we already have
// under a different DOI/no DOI at all (e.g. Google Scholar results, PCI RR's
// own commentary documents).
export async function findMatchingPaper(
  title: string
): Promise<{ id: number; title: string; studyPaper: { studyId: number } | null } | null> {
  const words = Array.from(significantWords(normalizeTitle(title)))
    .sort((a, b) => b.length - a.length)
    .slice(0, 3)
  if (words.length === 0) return null

  const candidates = await db.paper.findMany({
    where: {
      OR: words.map((w) => ({ title: { contains: w, mode: "insensitive" as const } })),
      status: { notIn: ["REJECTED", "DUPLICATE"] },
    },
    select: { id: true, title: true, studyPaper: { select: { studyId: true } } },
    take: 50,
  })

  return bestTitleMatch(title, candidates)
}

// Single source of truth for "how many things need attention on the Link
// papers page" — used by the nav badge, the admin home card, and the stats
// page, so they can't drift out of sync with what that page actually shows
// under its "Needs review" tab (every eligible, not-yet-touched paper,
// including singletons with no title match).
export async function countLinkNeedsReviewGroups(): Promise<number> {
  const [papers, touched] = await Promise.all([
    db.paper.findMany({
      where: { status: { in: [...LINK_ELIGIBLE_STATUSES] }, canonicalPaperId: null },
      select: {
        id: true,
        title: true,
        status: true,
        canonicalPaperId: true,
        studyPaper: { select: { study: { select: { _count: { select: { papers: true } } } } } },
      },
    }),
    db.paperEditHistory.findMany({
      where: { source: "link" },
      select: { paperId: true },
      distinct: ["paperId"],
    }),
  ])

  const touchedIds = new Set(touched.map((t) => t.paperId))
  const eligible = papers.filter(isLinkEligible).filter((p) => !touchedIds.has(p.id))
  return clusterPapersByTitle(eligible, 1).length
}
