import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { findExistingPaper } from "src/lib/findExistingPaper"

const SubmitArticleSuggestion = z
  .object({
    title: z.string().max(500).nullable(),
    authors: z.string().max(500).nullable(),
    year: z.number().int().min(1900).max(2100).nullable(),
    doi: z.string().max(200).nullable(),
    url: z.string().max(500).nullable(),
    note: z.string().max(1000).nullable(),
    // Set when the user saw a similar-title warning and wants to send it anyway.
    force: z.boolean().optional(),
  })
  .refine((d) => d.title || d.doi || d.url, {
    message: "Please provide at least a title, DOI, or URL",
  })

export default resolver.pipe(
  resolver.zod(SubmitArticleSuggestion),
  resolver.authorize(),
  async ({ title, authors, year, doi, url, note, force }, ctx) => {
    const userId = ctx.session.userId as number

    // Already in the database? An exact DOI or link match is always stopped; a
    // merely similar title is flagged once and can be sent anyway.
    const match = await findExistingPaper({ doi, url, title })
    if (match && (match.matchedOn !== "title" || !force)) {
      const visible = match.status === "IMPORTED" || match.status === "APPROVED"
      return {
        ok: false as const,
        duplicate: {
          title: match.title,
          exact: match.matchedOn !== "title",
          // Only link to items the public can open (not pending/excluded ones).
          href: visible ? (match.studyId ? `/studies/${match.studyId}` : `/papers/${match.id}`) : null,
        },
      }
    }

    await db.articleSuggestion.create({
      data: { userId, title, authors, year, doi, url, note },
    })
    return { ok: true as const }
  }
)
