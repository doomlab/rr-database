import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { AddPaperInput, resolvePaperForAdd } from "src/lib/addPaperInput"
import { STUDY_PAPER_ROLE_LABELS, STUDY_PAPER_ROLE_VALUES } from "src/lib/studyPaperRoles"

const AddPaperToStudy = AddPaperInput.extend({
  // Either an existing study, or (for an item that isn't in a study yet) the
  // item to start a new study from, with the role it should have in it.
  studyId: z.number().optional(),
  anchorPaperId: z.number().optional(),
  anchorRole: z.enum(STUDY_PAPER_ROLE_VALUES).optional(),
  role: z.enum(STUDY_PAPER_ROLE_VALUES),
})

// Adds an item straight to an existing study from its page — e.g. the Stage 1
// for a Stage 2 that was found on its own. The item can be one already in the
// database, a DOI (looked up on Crossref) or typed-in metadata. It is tagged
// with the chosen role and approved, as in the Link step. From the page of an
// item that has no study (e.g. after it was unlinked), pass that item as the
// anchor and a new study is created to hold both.
export default resolver.pipe(
  resolver.zod(AddPaperToStudy),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ studyId: givenStudyId, anchorPaperId, anchorRole, role, ...input }, ctx) => {
    const userId = ctx.session.userId as number

    let studyId: number
    if (givenStudyId) {
      const study = await db.study.findUnique({ where: { id: givenStudyId }, select: { id: true } })
      if (!study) throw new Error("Study not found.")
      studyId = study.id
    } else if (anchorPaperId) {
      const anchor = await db.paper.findUnique({
        where: { id: anchorPaperId },
        select: { id: true, status: true, studyPaper: { select: { studyId: true } } },
      })
      if (!anchor) throw new Error("Item not found.")
      if (anchor.studyPaper) {
        studyId = anchor.studyPaper.studyId
      } else {
        studyId = (await db.study.create({ data: {} })).id
        await db.studyPaper.create({ data: { studyId, paperId: anchor.id, role: anchorRole ?? "OTHER" } })
        if (anchor.status !== "IMPORTED" && anchor.status !== "APPROVED") {
          await db.paper.update({
            where: { id: anchor.id },
            data: { status: "APPROVED", reviewedById: userId, reviewedAt: new Date() },
          })
        }
        await db.paperEditHistory.create({
          data: {
            paperId: anchor.id,
            userId,
            source: "link",
            summary: `Added to study #${studyId} as ${STUDY_PAPER_ROLE_LABELS[anchorRole ?? "OTHER"]}`,
          },
        })
      }
    } else {
      throw new Error("Study not found.")
    }

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

    return { paperId, studyId, title: paper.title }
  }
)
