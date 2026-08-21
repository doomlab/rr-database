import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db, { PaperStatus } from "db"

const SearchVenues = z.object({ q: z.string().min(1) })

export default resolver.pipe(resolver.zod(SearchVenues), async ({ q }) => {
  const rows = await db.paper.findMany({
    where: {
      status: { in: [PaperStatus.IMPORTED, PaperStatus.APPROVED] },
      venue: { contains: q, mode: "insensitive" },
    },
    select: { venue: true },
    distinct: ["venue"],
    orderBy: { venue: "asc" },
    take: 20,
  })
  return rows.map((r) => r.venue).filter((v): v is string => !!v)
})
