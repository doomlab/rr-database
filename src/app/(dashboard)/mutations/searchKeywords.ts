import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db, { Prisma, PaperStatus } from "db"

const SearchKeywords = z.object({ q: z.string().min(1) })

export default resolver.pipe(resolver.zod(SearchKeywords), async ({ q }) => {
  const rows = await db.$queryRaw<{ keyword: string }[]>(Prisma.sql`
    SELECT DISTINCT kw AS keyword
    FROM "Paper", unnest(keywords) AS kw
    WHERE status::text IN (${PaperStatus.IMPORTED}, ${PaperStatus.APPROVED})
      AND kw ILIKE ${"%" + q + "%"}
    ORDER BY kw ASC
    LIMIT 20
  `)
  return rows.map((r) => r.keyword)
})
