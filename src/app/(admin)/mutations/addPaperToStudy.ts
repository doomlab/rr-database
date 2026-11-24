import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { AddPaperInput, resolvePaperForAdd } from "src/lib/addPaperInput"
import { STUDY_PAPER_ROLE_LABELS, STUDY_PAPER_ROLE_VALUES } from "src/lib/studyPaperRoles"

const AddPaperToStudy = AddPaperInput.extend({
  studyId: z.number(),
  role: z.enum(STUDY_PAPER_ROLE_VALUES),
})

// Adds an item straight to an existing study from its page — e.g. the Stage 1
// for a Stage 2 that was found on its own. The item can be one already in the
// database, a DOI (looked up on Crossref) or typed-in metadata. It is tagged
// with the chosen role and approved, as in the Link step.
export default resolver.pipe(
  resolver.zod(AddPaperToStudy),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ studyId, role, ...input }, ctx) => {
    const userId = ctx.session.userId as number

    const study = await db.study.findUnique({ where: { id: studyId }, select: { id: true } })
    if (!study) throw new Error("Study not found.")

    const paperId = await resolvePaperForAdd(input)
    const paper = await db.paper.findUnique({
      where: { id: paperId },
      select: { id: true, title: true, status: true, studyPaper: { select: { studyId: true } } },
    })
    if (!paper) throw new Error(`No item with ID #${paperId} exists.`)

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
        summary: `Added to study #${studyId} as ${STUDY_PAPER_ROLE_LABELS[role]}`,
      },
    })

    return { paperId, title: paper.title }
  }
)
