import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const SearchPapersToLink = z.object({ q: z.string().min(2), excludePaperId: z.number().optional() })

export default resolver.pipe(
  resolver.zod(SearchPapersToLink),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ q, excludePaperId }) => {
    return db.paper.findMany({
      where: {
        AND: [
          excludePaperId ? { id: { not: excludePaperId } } : {},
          {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { doi: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: { id: true, title: true, year: true, doi: true },
      orderBy: { title: "asc" },
      take: 10,
    })
  }
)
