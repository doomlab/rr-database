import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const SearchAuthors = z.object({ q: z.string().min(2) })

export default resolver.pipe(resolver.zod(SearchAuthors), resolver.authorize(), async ({ q }) => {
  return db.author.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    orderBy: { name: "asc" },
    take: 10,
  })
})
