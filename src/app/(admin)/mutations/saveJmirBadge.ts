import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { JMIR_BADGE_TYPES } from "src/lib/jmirBadgeOptions"
import { fetchOrCreatePaperByDoi, normalizeDoi } from "src/lib/crossrefPaperLookup"

const SaveJmirBadge = z.object({
  paperId: z.number(),
  badgeType: z.enum(JMIR_BADGE_TYPES),
  counterpartDoi: z.string().trim().optional(),
})

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
