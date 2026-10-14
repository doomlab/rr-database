import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { fetchOrCreatePaperByDoi, normalizeDoi } from "src/lib/crossrefPaperLookup"
import { upsertAuthors } from "src/lib/zoteroImport"

// Brings one more paper into the workflow's current group: an existing paper
// picked from search, a DOI (looked up on Crossref if it isn't in the
// database yet), or a bare title for something with no DOI. New papers start
// as PENDING_REVIEW; linking them with a role approves them, like every
// other paper in the Link step.
const AddPaperToWorkflow = z.object({
  paperId: z.number().optional(),
  doi: z.string().trim().optional(),
  // Manual entry — used when there's no DOI to look up, or the admin wants to
  // type the metadata themselves. Any of these may be left blank except title.
  title: z.string().trim().optional(),
  authors: z.array(z.string().trim().min(1)).optional(),
  year: z.number().int().nullable().optional(),
  venue: z.string().trim().nullable().optional(),
  url: z.string().trim().nullable().optional(),
})

const select = {
  id: true,
  title: true,
  year: true,
  venue: true,
  doi: true,
  status: true,
  stage: true,
  studyPaper: { select: { role: true } },
  authors: { select: { author: { select: { name: true } } }, orderBy: { position: "asc" } },
} as const

export default resolver.pipe(
  resolver.zod(AddPaperToWorkflow),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async (input) => {
    let paperId: number

    if (input.paperId) {
      paperId = input.paperId
    } else if (input.title) {
      // Manual entry. If the DOI or link is already in the database, reuse
      // that paper instead of creating a duplicate.
      const doi = input.doi ? normalizeDoi(input.doi) : null
      const url = input.url || null
      const existing =
        doi || url
          ? await db.paper.findFirst({
              where: { OR: [...(doi ? [{ doi }] : []), ...(url ? [{ url }] : [])] },
              select: { id: true },
            })
          : null

      if (existing) {
        paperId = existing.id
      } else {
        const paper = await db.paper.create({
          data: {
            title: input.title,
            doi,
            year: input.year ?? null,
            venue: input.venue || null,
            url,
            status: "PENDING_REVIEW",
            discoveredVia: ["USER_SUGGESTION"],
          },
        })
        paperId = paper.id
        if (input.authors && input.authors.length > 0) {
          await upsertAuthors(
            paperId,
            input.authors.map((name) => ({ name, orcid: null, openalexAuthorId: null }))
          )
        }
      }
    } else if (input.doi) {
      paperId = (await fetchOrCreatePaperByDoi(normalizeDoi(input.doi), { discoveredVia: "USER_SUGGESTION" })).id
    } else {
      throw new Error("Pick an item, or enter a DOI or a title.")
    }

    const paper = await db.paper.findUnique({ where: { id: paperId }, select })
    if (!paper) throw new Error(`No item with ID #${paperId} exists.`)
    return paper
  }
)
