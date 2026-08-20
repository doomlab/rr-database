import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const ROLE_VALUES = ["STAGE1_ARTICLE", "STAGE1_MATERIALS", "STAGE2_ARTICLE", "STAGE2_MATERIALS"] as const

const Assignment = z.discriminatedUnion("action", [
  z.object({ action: z.literal("skip"), paperId: z.number() }),
  z.object({ action: z.literal("role"), paperId: z.number(), role: z.enum(ROLE_VALUES) }),
  z.object({ action: z.literal("duplicate"), paperId: z.number(), duplicateOfPaperId: z.number() }),
])

const LinkDuplicateGroup = z.object({
  assignments: z.array(Assignment).min(1),
})

export default resolver.pipe(
  resolver.zod(LinkDuplicateGroup),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ assignments }, ctx) => {
    const userId = ctx.session.userId as number

    const roled = assignments.filter((a) => a.action === "role")
    const duplicates = assignments.filter((a) => a.action === "duplicate")

    if (roled.length > 0) {
      const study = await db.study.create({ data: {} })

      for (const a of roled) {
        const paper = await db.paper.findUnique({ where: { id: a.paperId } })
        if (!paper) continue

        await db.studyPaper.create({
          data: { studyId: study.id, paperId: a.paperId, role: a.role },
        })

        if (paper.status !== "IMPORTED" && paper.status !== "APPROVED") {
          await db.paper.update({
            where: { id: a.paperId },
            data: { status: "APPROVED", reviewedById: userId, reviewedAt: new Date() },
          })
          await db.paperExtraction.upsert({
            where: { paperId: a.paperId },
            create: { paperId: a.paperId, extractedData: {}, needsReview: true },
            update: {},
          })
        }
      }
    }

    for (const a of duplicates) {
      await db.paper.update({
        where: { id: a.paperId },
        data: { status: "DUPLICATE", canonicalPaperId: a.duplicateOfPaperId },
      })
    }

    return { success: true }
  }
)
