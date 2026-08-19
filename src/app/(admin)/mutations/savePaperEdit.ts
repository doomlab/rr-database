import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { fetchAndStoreCitations } from "src/lib/fetchAndStoreCitations"

const SavePaperEdit = z.object({
  paperId: z.number(),
  source: z.enum(["openalex", "crossref", "manual"]),
  title: z.string().min(1),
  doi: z.string().nullable(),
  abstract: z.string().nullable(),
  year: z.number().nullable(),
  venue: z.string().nullable(),
  volume: z.string().nullable(),
  issue: z.string().nullable(),
  pages: z.string().nullable(),
  issn: z.string().nullable(),
  publisher: z.string().nullable(),
  language: z.string().nullable(),
  url: z.string().nullable(),
  pdfUrl: z.string().nullable(),
  openAccess: z.boolean().nullable(),
  citedByCount: z.number().nullable(),
  openalexId: z.string().nullable(),
})

export default resolver.pipe(
  resolver.zod(SavePaperEdit),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ paperId, source, ...data }, ctx) => {
    const [updated] = await db.$transaction([
      db.paper.update({
        where: { id: paperId },
        data: {
          ...data,
          ...(source === "openalex" ? { openAlexFetchedAt: new Date() } : {}),
          ...(source === "crossref" ? { crossrefQueried: true, crossrefFound: true } : {}),
        },
      }),
      db.paperEditHistory.create({
        data: {
          paperId,
          userId: ctx.session.userId as number,
          source,
        },
      }),
    ])

    if (source === "openalex" && updated.openalexId) {
      await fetchAndStoreCitations(paperId, updated.openalexId, updated.doi)
    }

    return updated
  }
)
