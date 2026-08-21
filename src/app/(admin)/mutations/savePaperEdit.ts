import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { fetchAndStoreCitations } from "src/lib/fetchAndStoreCitations"

const AuthorInput = z.object({
  id: z.number().nullable(),
  name: z.string(),
  orcid: z.string().nullable(),
  openalexAuthorId: z.string().nullable(),
})

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
  itemType: z.string().nullable(),
  url: z.string().nullable(),
  pdfUrl: z.string().nullable(),
  openAccess: z.boolean().nullable(),
  openAccessStatus: z.string().nullable(),
  citedByCount: z.number().nullable(),
  openalexId: z.string().nullable(),
  registrationUrl: z.string().nullable(),
  registrationPlatform: z.string().nullable(),
  biasLevel: z.string().nullable(),
  openDataUrl: z.string().nullable(),
  openCodeUrl: z.string().nullable(),
  openMaterialsUrl: z.string().nullable(),
  zoteroNotes: z.string().nullable(),
  jmirBadgeType: z.string().nullable(),
  jmirBadgeCounterpartDoi: z.string().nullable(),
  tags: z.array(z.string()),
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
          ...(data.jmirBadgeType ? { jmirBadgeCheckedAt: new Date() } : {}),
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
        const authorData = { name, orcid: a.orcid, openalexAuthorId: a.openalexAuthorId }
        // An id-matched row is a trusted direct edit — overwrite. The
        // upsert-by-name fallback might coincidentally match an unrelated
        // existing Author, so it only fills in blanks, never clobbers.
        const author = a.id
          ? await tx.author.update({ where: { id: a.id }, data: authorData })
          : await tx.author.upsert({
              where: { name },
              create: authorData,
              update: {
                ...(a.orcid ? { orcid: a.orcid } : {}),
                ...(a.openalexAuthorId ? { openalexAuthorId: a.openalexAuthorId } : {}),
              },
            })
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
