import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const HEADERS = { "User-Agent": "mailto:buchananlab@gmail.com" }

const EnrichFromCrossref = z.object({
  paperId: z.number(),
})

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim()
}

export default resolver.pipe(
  resolver.zod(EnrichFromCrossref),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ paperId }) => {
    const paper = await db.paper.findUniqueOrThrow({ where: { id: paperId } })

    if (!paper.doi) {
      throw new Error("Paper has no DOI to look it up by")
    }

    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(paper.doi)}`, {
      headers: HEADERS,
    })

    if (!res.ok) {
      await db.paper.update({ where: { id: paperId }, data: { crossrefQueried: true, crossrefFound: false } })
      throw new Error(`Crossref lookup failed (${res.status})`)
    }

    const { message } = await res.json()

    const venue: string | null = message["container-title"]?.[0] ?? null
    const volume: string | null = message.volume ?? null
    const issue: string | null = message.issue ?? null
    const pages: string | null = message.page ?? null
    const issn: string | null = message.ISSN?.[0] ?? null
    const publisher: string | null = message.publisher ?? null
    const abstract: string | null = message.abstract ? stripTags(message.abstract) : null

    return db.paper.update({
      where: { id: paperId },
      data: {
        venue: paper.venue ?? venue,
        volume: paper.volume ?? volume,
        issue: paper.issue ?? issue,
        pages: paper.pages ?? pages,
        issn: paper.issn ?? issn,
        publisher: paper.publisher ?? publisher,
        abstract: paper.abstract ?? abstract,
        crossrefQueried: true,
        crossrefFound: true,
      },
    })
  }
)
