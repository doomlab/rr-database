import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const TogglePaperFavorite = z.object({
  paperId: z.number(),
})

export default resolver.pipe(
  resolver.zod(TogglePaperFavorite),
  resolver.authorize(),
  async ({ paperId }, ctx) => {
    const userId = ctx.session.userId as number
    const existing = await db.paperFavorite.findUnique({
      where: { userId_paperId: { userId, paperId } },
    })
    if (existing) {
      await db.paperFavorite.delete({ where: { id: existing.id } })
      return { favorited: false }
    }
    await db.paperFavorite.create({ data: { userId, paperId } })
    return { favorited: true }
  }
)
