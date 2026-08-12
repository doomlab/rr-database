import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const ResolveSuggestion = z.object({
  suggestionId: z.number(),
})

export default resolver.pipe(
  resolver.zod(ResolveSuggestion),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ suggestionId }) => {
    return db.articleSuggestion.update({ where: { id: suggestionId }, data: { resolved: true } })
  }
)
