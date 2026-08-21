import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const ROLE_VALUES = [
  "STAGE1_ARTICLE",
  "STAGE1_MATERIALS",
  "STAGE2_ARTICLE",
  "STAGE2_MATERIALS",
  "PCIRR_PAGE",
  "OTHER",
] as const

const ROLE_LABELS: Record<(typeof ROLE_VALUES)[number], string> = {
  STAGE1_ARTICLE: "Stage 1 article",
  STAGE1_MATERIALS: "Stage 1 materials",
  STAGE2_ARTICLE: "Stage 2 article",
  STAGE2_MATERIALS: "Stage 2 materials",
  PCIRR_PAGE: "PCI RR page",
  OTHER: "Other",
}

const LinkPaperWithExisting = z.object({
  paperId: z.number(),
  role: z.enum(ROLE_VALUES),
  targetPaperId: z.number(),
})

// Links a paper that didn't auto-match anyone by title into the same Study
// as a specific other paper the admin picked by ID — for Stage 1/Stage 2
// pairs whose titles differ too much to cluster automatically.
export default resolver.pipe(
  resolver.zod(LinkPaperWithExisting),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ paperId, role, targetPaperId }, ctx) => {
    const userId = ctx.session.userId as number
    if (paperId === targetPaperId) throw new Error("Pick a different paper to link with.")

    const target = await db.paper.findUnique({
      where: { id: targetPaperId },
      select: { id: true, title: true, studyPaper: { select: { studyId: true } } },
    })
    if (!target) throw new Error(`No paper with ID #${targetPaperId} exists.`)

    const paper = await db.paper.findUnique({
      where: { id: paperId },
      select: { id: true, status: true, studyPaper: { select: { studyId: true } } },
    })
    if (!paper) throw new Error("Paper not found.")

    const studyId = target.studyPaper?.studyId ?? (await db.study.create({ data: {} })).id
    if (!target.studyPaper) {
      await db.studyPaper.create({ data: { studyId, paperId: target.id, role: "OTHER" } })
    }

    if (paper.studyPaper) {
      if (paper.studyPaper.studyId !== studyId) {
        const oldStudyId = paper.studyPaper.studyId
        await db.studyPaper.update({ where: { paperId }, data: { studyId, role } })
        await db.study.deleteMany({ where: { id: oldStudyId, papers: { none: {} } } })
      } else {
        await db.studyPaper.update({ where: { paperId }, data: { role } })
      }
    } else {
      await db.studyPaper.create({ data: { studyId, paperId, role } })
    }

    if (paper.status !== "IMPORTED" && paper.status !== "APPROVED") {
      await db.paper.update({
        where: { id: paperId },
        data: { status: "APPROVED", reviewedById: userId, reviewedAt: new Date() },
      })
    }

    await db.paperEditHistory.create({
      data: {
        paperId,
        userId,
        source: "link",
        summary: `Linked as ${ROLE_LABELS[role]} with paper #${targetPaperId}`,
      },
    })

    return { success: true, targetTitle: target.title }
  }
)
