import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const ReportPaper = z.object({
  paperId: z.number(),
  reason: z.string().min(1).default("flagged"),
})

export default resolver.pipe(
  resolver.zod(ReportPaper),
  resolver.authorize(),
  async ({ paperId, reason }, ctx) => {
    const userId = ctx.session.userId as number
    const existing = await db.paperReport.findUnique({
      where: { userId_paperId: { userId, paperId } },
    })
    if (existing) {
      await db.paperReport.delete({ where: { id: existing.id } })
      return { reported: false }
    }
    await db.paperReport.create({ data: { userId, paperId, reason } })
    return { reported: true }
  }
)
