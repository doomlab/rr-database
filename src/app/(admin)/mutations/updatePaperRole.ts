import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { STUDY_PAPER_ROLE_VALUES } from "src/lib/studyPaperRoles"

const UpdatePaperRole = z.object({
  paperId: z.number(),
  role: z.enum(STUDY_PAPER_ROLE_VALUES),
})

export default resolver.pipe(
  resolver.zod(UpdatePaperRole),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ paperId, role }, ctx) => {
    const userId = ctx.session.userId as number
    const existing = await db.studyPaper.findUnique({ where: { paperId } })

    if (existing) {
      await db.studyPaper.update({ where: { paperId }, data: { role } })
    } else {
      // No Study yet (shouldn't normally happen for a confirmed paper, but
      // guards against it) — give it a solo one instead of erroring.
      const study = await db.study.create({ data: {} })
      await db.studyPaper.create({ data: { studyId: study.id, paperId, role } })
    }

    await db.paperEditHistory.create({
      data: { paperId, userId, source: "link", summary: `Role set to ${role}` },
    })

    return { role }
  }
)
