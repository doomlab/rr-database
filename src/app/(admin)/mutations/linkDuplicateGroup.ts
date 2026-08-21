import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const ROLE_VALUES = [
  "STAGE1_ARTICLE",
  "STAGE1_MATERIALS",
  "STAGE2_ARTICLE",
  "STAGE2_MATERIALS",
  "PCIRR_PAGE",
  "PCIRR_REVIEW",
  "PCIRR_AUTHOR_RESPONSE",
  "PCIRR_DECISION",
  "OTHER",
] as const

const Assignment = z.discriminatedUnion("action", [
  z.object({ action: z.literal("role"), paperId: z.number(), role: z.enum(ROLE_VALUES) }),
  z.object({ action: z.literal("duplicate"), paperId: z.number(), duplicateOfPaperId: z.number() }),
  z.object({ action: z.literal("unlink"), paperId: z.number() }),
])

const LinkDuplicateGroup = z.object({
  assignments: z.array(Assignment).min(1),
})

const ROLE_LABELS: Record<(typeof ROLE_VALUES)[number], string> = {
  STAGE1_ARTICLE: "Stage 1 article",
  STAGE1_MATERIALS: "Stage 1 materials",
  STAGE2_ARTICLE: "Stage 2 article",
  STAGE2_MATERIALS: "Stage 2 materials",
  PCIRR_PAGE: "PCI RR recommendation",
  PCIRR_REVIEW: "PCI RR review",
  PCIRR_AUTHOR_RESPONSE: "PCI RR author response",
  PCIRR_DECISION: "PCI RR decision",
  OTHER: "Other",
}

// Deletes a paper's current StudyPaper link (if any) and, if that leaves its
// old Study with no papers left, deletes the now-empty Study too. Most
// papers already sit in a leftover solo 1-paper Study from an old migration,
// so "unlinking" or "reassigning" almost always means cleaning one of these
// up rather than acting on a real multi-paper Study.
async function detachFromCurrentStudy(paperId: number) {
  const existing = await db.studyPaper.findUnique({ where: { paperId } })
  if (!existing) return
  await db.studyPaper.delete({ where: { paperId } })
  await db.study.deleteMany({ where: { id: existing.studyId, papers: { none: {} } } })
}

export default resolver.pipe(
  resolver.zod(LinkDuplicateGroup),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ assignments }, ctx) => {
    const userId = ctx.session.userId as number

    const roled = assignments.filter((a) => a.action === "role")
    const duplicates = assignments.filter((a) => a.action === "duplicate")
    const unlinked = assignments.filter((a) => a.action === "unlink")

    if (roled.length > 0) {
      const papers = await db.paper.findMany({
        where: { id: { in: roled.map((a) => a.paperId) } },
        select: { id: true, status: true, studyPaper: { select: { studyId: true } } },
      })
      const paperById = new Map(papers.map((p) => [p.id, p]))

      // Reuse an existing Study if any of these papers is already in one
      // (almost always true, given the leftover solo studies) instead of
      // always minting a new one.
      const existingStudyIds = Array.from(
        new Set(papers.map((p) => p.studyPaper?.studyId).filter((id): id is number => id != null))
      )
      const targetStudyId = existingStudyIds[0] ?? (await db.study.create({ data: {} })).id
      const staleStudyIds = existingStudyIds.filter((id) => id !== targetStudyId)

      for (const a of roled) {
        const paper = paperById.get(a.paperId)
        if (!paper) continue

        if (paper.studyPaper) {
          await db.studyPaper.update({
            where: { paperId: a.paperId },
            data: { studyId: targetStudyId, role: a.role },
          })
        } else {
          await db.studyPaper.create({
            data: { studyId: targetStudyId, paperId: a.paperId, role: a.role },
          })
        }

        if (paper.status !== "IMPORTED" && paper.status !== "APPROVED") {
          await db.paper.update({
            where: { id: a.paperId },
            data: { status: "APPROVED", reviewedById: userId, reviewedAt: new Date() },
          })
        }

        await db.paperEditHistory.create({
          data: {
            paperId: a.paperId,
            userId,
            source: "link",
            summary: `Linked as ${ROLE_LABELS[a.role]}`,
          },
        })
      }

      if (staleStudyIds.length > 0) {
        await db.study.deleteMany({ where: { id: { in: staleStudyIds }, papers: { none: {} } } })
      }
    }

    for (const a of duplicates) {
      await detachFromCurrentStudy(a.paperId)
      await db.paper.update({
        where: { id: a.paperId },
        data: { status: "DUPLICATE", canonicalPaperId: a.duplicateOfPaperId },
      })
      await db.paperEditHistory.create({
        data: {
          paperId: a.paperId,
          userId,
          source: "link",
          summary: `Marked as a duplicate of paper #${a.duplicateOfPaperId}`,
        },
      })
    }

    for (const a of unlinked) {
      await detachFromCurrentStudy(a.paperId)
      await db.paperEditHistory.create({
        data: { paperId: a.paperId, userId, source: "link", summary: "Unlinked from study" },
      })
    }

    return { success: true }
  }
)
