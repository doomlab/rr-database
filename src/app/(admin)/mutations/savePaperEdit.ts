import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { fetchAndStoreCitations } from "src/lib/fetchAndStoreCitations"

const AuthorInput = z.object({ id: z.number().nullable(), name: z.string() })

const SavePaperEdit = z.object({
  paperId: z.number(),
  source: z.enum(["openalex", "crossref", "manual"]),
  title: z.string().min(1),
  authors: z.array(AuthorInput),
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
  openAccessStatus: z.string().nullable(),
  citedByCount: z.number().nullable(),
  openalexId: z.string().nullable(),
  keywords: z.array(z.string().toLowerCase().trim()),
})

export default resolver.pipe(
  resolver.zod(SavePaperEdit),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ paperId, source, authors, ...data }, ctx) => {
    const updated = await db.$transaction(async (tx) => {
      const paper = await tx.paper.update({
        where: { id: paperId },
        data: {
          ...data,
          ...(source === "openalex" ? { openAlexFetchedAt: new Date() } : {}),
          ...(source === "crossref" ? { crossrefQueried: true, crossrefFound: true } : {}),
        },
      })
      await tx.paperEditHistory.create({
        data: { paperId, userId: ctx.session.userId as number, source },
      })

      await tx.paperAuthor.deleteMany({ where: { paperId } })
      let position = 0
      for (const a of authors) {
        const name = a.name.trim()
        if (!name) continue
        const author = a.id
          ? await tx.author.update({ where: { id: a.id }, data: { name } })
          : await tx.author.upsert({ where: { name }, create: { name }, update: {} })
        await tx.paperAuthor.create({ data: { paperId, authorId: author.id, position } })
        position++
      }

      return paper
    })

    if (source === "openalex" && updated.openalexId) {
      await fetchAndStoreCitations(paperId, updated.openalexId, updated.doi)
    }

    return updated
  }
)
