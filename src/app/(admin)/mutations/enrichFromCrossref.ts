import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { fetchCrossrefFields } from "src/lib/enrichment"

const EnrichFromCrossref = z.object({
  paperId: z.number(),
})

export default resolver.pipe(
  resolver.zod(EnrichFromCrossref),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ paperId }, ctx) => {
    const paper = await db.paper.findUniqueOrThrow({ where: { id: paperId } })

    let fields
    try {
      fields = await fetchCrossrefFields(paper)
    } catch (e) {
      await db.paper.update({ where: { id: paperId }, data: { crossrefQueried: true, crossrefFound: false } })
      throw e
    }

    const [updated] = await db.$transaction([
      db.paper.update({
        where: { id: paperId },
        data: {
          venue: paper.venue ?? fields.venue,
          volume: paper.volume ?? fields.volume,
          issue: paper.issue ?? fields.issue,
          pages: paper.pages ?? fields.pages,
          issn: paper.issn ?? fields.issn,
          publisher: paper.publisher ?? fields.publisher,
          abstract: paper.abstract ?? fields.abstract,
          crossrefQueried: true,
          crossrefFound: true,
        },
      }),
      db.paperEditHistory.create({
        data: {
          paperId,
          userId: ctx.session.userId as number,
          source: "crossref",
        },
      }),
    ])

    return updated
  }
)
