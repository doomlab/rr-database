import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { upsertAuthors } from "src/lib/zoteroImport"

// The JMIR-specific "timing of registration" designations from the tagging
// doc, plus a way to record that the badge was checked and nothing useful
// was found.
export const JMIR_BADGE_TYPES = [
  "DE_DATA_EXISTING",
  "PRE_REGISTERED",
  "REGISTERED",
  "POST",
  "STAGE2_ONLY",
  "STAGE1_ONLY",
  "NONE_FOUND",
] as const

const SaveJmirBadge = z.object({
  paperId: z.number(),
  badgeType: z.enum(JMIR_BADGE_TYPES),
  counterpartDoi: z.string().trim().optional(),
})

function normalizeDoi(raw: string): string {
  return raw.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim().toLowerCase()
}

async function fetchOrCreatePaperByDoi(doi: string): Promise<{ id: number; title: string; created: boolean }> {
  const existing = await db.paper.findFirst({ where: { doi }, select: { id: true, title: true } })
  if (existing) return { ...existing, created: false }

  const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
    headers: { "User-Agent": "mailto:buchananlab@gmail.com" },
  })
  if (!res.ok) throw new Error(`Could not find DOI ${doi} on Crossref (${res.status})`)
  const { message } = await res.json()

  const title: string = message.title?.[0] ?? "Untitled"
  const paper = await db.paper.create({
    data: {
      title,
      doi,
      year: message.issued?.["date-parts"]?.[0]?.[0] ?? null,
      venue: message["container-title"]?.[0] ?? null,
      publisher: message.publisher ?? null,
      volume: message.volume ?? null,
      issue: message.issue ?? null,
      pages: message.page ?? null,
      status: "PENDING_REVIEW",
    },
  })

  const authorNames: string[] = (message.author ?? [])
    .map((a: { given?: string; family?: string }) => [a.given, a.family].filter(Boolean).join(" "))
    .filter((n: string) => n.length > 0)
  await upsertAuthors(paper.id, authorNames)

  return { id: paper.id, title, created: true }
}

// Puts two papers in the same Study without touching their roles — this
// tool only knows "these two belong together," not which is Stage 1 vs
// Stage 2, so role assignment is left for the Link papers page afterward.
async function linkIntoSameStudy(paperIdA: number, paperIdB: number) {
  const [linkA, linkB] = await Promise.all([
    db.studyPaper.findUnique({ where: { paperId: paperIdA } }),
    db.studyPaper.findUnique({ where: { paperId: paperIdB } }),
  ])

  const studyId = linkA?.studyId ?? linkB?.studyId ?? (await db.study.create({ data: {} })).id

  if (!linkA) {
    await db.studyPaper.create({ data: { studyId, paperId: paperIdA, role: "OTHER" } })
  } else if (linkA.studyId !== studyId) {
    await db.studyPaper.update({ where: { paperId: paperIdA }, data: { studyId } })
  }

  if (!linkB) {
    await db.studyPaper.create({ data: { studyId, paperId: paperIdB, role: "OTHER" } })
  } else if (linkB.studyId !== studyId) {
    await db.studyPaper.update({ where: { paperId: paperIdB }, data: { studyId } })
  }
}

export default resolver.pipe(
  resolver.zod(SaveJmirBadge),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ paperId, badgeType, counterpartDoi }, ctx) => {
    const userId = ctx.session.userId as number
    const doi = counterpartDoi ? normalizeDoi(counterpartDoi) : null

    await db.paper.update({
      where: { id: paperId },
      data: { jmirBadgeType: badgeType, jmirBadgeCounterpartDoi: doi, jmirBadgeCheckedAt: new Date() },
    })

    await db.paperEditHistory.create({
      data: {
        paperId,
        userId,
        source: "manual",
        summary: `JMIR badge: ${badgeType}${doi ? ` (counterpart ${doi})` : ""}`,
      },
    })

    if (!doi) return { linked: false, created: false, counterpartTitle: null }

    const counterpart = await fetchOrCreatePaperByDoi(doi)
    await linkIntoSameStudy(paperId, counterpart.id)

    return { linked: true, created: counterpart.created, counterpartTitle: counterpart.title }
  }
)
