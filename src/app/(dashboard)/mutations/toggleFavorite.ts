import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const ToggleFavorite = z.object({
  studyId: z.number(),
})

export default resolver.pipe(
  resolver.zod(ToggleFavorite),
  resolver.authorize(),
  async ({ studyId }, ctx) => {
    const userId = ctx.session.userId as number
    const existing = await db.studyFavorite.findUnique({
      where: { userId_studyId: { userId, studyId } },
    })
    if (existing) {
      await db.studyFavorite.delete({ where: { id: existing.id } })
      return { favorited: false }
    }
    await db.studyFavorite.create({ data: { userId, studyId } })
    return { favorited: true }
  }
)
