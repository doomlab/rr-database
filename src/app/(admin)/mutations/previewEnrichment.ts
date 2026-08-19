import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { fetchCrossrefFields, fetchOpenAlexFields } from "src/lib/enrichment"

const PreviewEnrichment = z.object({
  paperId: z.number(),
  source: z.enum(["openalex", "crossref"]),
})

export default resolver.pipe(
  resolver.zod(PreviewEnrichment),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ paperId, source }) => {
    const paper = await db.paper.findUniqueOrThrow({ where: { id: paperId } })
    const fetched = source === "openalex" ? await fetchOpenAlexFields(paper) : await fetchCrossrefFields(paper)

    const fields = Object.keys(fetched) as (keyof typeof fetched)[]
    const changes = fields
      .filter((field) => fetched[field] != null && (paper as any)[field] !== fetched[field])
      .map((field) => ({
        field,
        current: (paper as any)[field] ?? null,
        proposed: fetched[field],
      }))

    return { changes }
  }
)
