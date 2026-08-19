import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { fetchOpenAlexFields } from "src/lib/enrichment"

const EnrichFromOpenAlex = z.object({
  paperId: z.number(),
})

export default resolver.pipe(
  resolver.zod(EnrichFromOpenAlex),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ paperId }, ctx) => {
    const paper = await db.paper.findUniqueOrThrow({ where: { id: paperId } })
    const fields = await fetchOpenAlexFields(paper)

    const [updated] = await db.$transaction([
      db.paper.update({
        where: { id: paperId },
        data: {
          pdfUrl: fields.pdfUrl ?? paper.pdfUrl,
          openAccess: fields.openAccess ?? paper.openAccess,
          citedByCount: fields.citedByCount ?? paper.citedByCount,
          venue: paper.venue ?? fields.venue,
          abstract: paper.abstract ?? fields.abstract,
          openalexId: paper.openalexId ?? fields.openalexId,
          openAlexFetchedAt: new Date(),
        },
      }),
      db.paperEditHistory.create({
        data: {
          paperId,
          userId: ctx.session.userId as number,
          source: "openalex",
        },
      }),
    ])

    return updated
  }
)
