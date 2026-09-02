import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const CreateSavedSearch = z.object({ name: z.string().min(1).max(100), query: z.string().max(2000) })

export default resolver.pipe(
  resolver.zod(CreateSavedSearch),
  resolver.authorize(),
  async ({ name, query }, ctx) => {
    const userId = ctx.session.userId as number
    return db.savedSearch.create({ data: { userId, name, query } })
  }
)
