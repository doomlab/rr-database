import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { applyPaperEdit } from "src/lib/applyPaperEdit"
import { fetchCrossrefFields, fetchOpenAlexFields, titleHint } from "src/lib/enrichment"
import { userHasOpenAlexApiKey } from "src/lib/apiKeyPool"

const PullPaperData = z.object({
  paperId: z.number(),
  source: z.enum(["openalex", "crossref"]),
})

// Fetches a paper's data from OpenAlex or Crossref and saves it straight away
// — the same result as opening the pull page and saving without editing,
// where anything the source returns replaces what's there and anything it
// doesn't return is kept. The edit is recorded in the paper's history, and
// the Metadata step is where the result gets checked.
export default resolver.pipe(
  resolver.zod(PullPaperData),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ paperId, source }, ctx) => {
    const userId = ctx.session.userId as number

    if (source === "openalex" && !(await userHasOpenAlexApiKey(userId))) {
      throw new Error("Add your OpenAlex API key on your Account page first.")
    }

    const paper = await db.paper.findUnique({
      where: { id: paperId },
      include: { authors: { include: { author: true }, orderBy: { position: "asc" } } },
    })
    if (!paper) throw new Error("Item not found.")

    const hint = titleHint(paper)
    const f =
      source === "openalex" ? await fetchOpenAlexFields(paper, hint) : await fetchCrossrefFields(paper, hint)

    const currentAuthors = paper.authors.map((pa) => ({
      id: pa.author.id,
      name: pa.author.name,
      orcid: pa.author.orcid,
      openalexAuthorId: pa.author.openalexAuthorId,
    }))
    // Fetched authorships carry no internal Author id — match by name so an
    // already-linked ORCID/OpenAlex id isn't dropped.
    const authors = f.authors
      ? f.authors.map((fa) => {
          const match = currentAuthors.find((ca) => ca.name.trim().toLowerCase() === fa.name.trim().toLowerCase())
          return {
            id: match?.id ?? null,
            name: fa.name,
            orcid: fa.orcid ?? match?.orcid ?? null,
            openalexAuthorId: fa.openalexAuthorId ?? match?.openalexAuthorId ?? null,
          }
        })
      : currentAuthors

    await applyPaperEdit(
      {
        paperId,
        source,
        authors,
        title: f.title ?? paper.title,
        doi: paper.doi ?? f.doi ?? null,
        abstract: f.abstract ?? paper.abstract,
        year: f.year ?? paper.year,
        venue: f.venue ?? paper.venue,
        volume: f.volume ?? paper.volume,
        issue: f.issue ?? paper.issue,
        pages: f.pages ?? paper.pages,
        issn: f.issn ?? paper.issn,
        publisher: f.publisher ?? paper.publisher,
        language: paper.language,
        itemType: paper.itemType,
        url: paper.url,
        pdfUrl: f.pdfUrl ?? paper.pdfUrl,
        openAccess: f.openAccess ?? paper.openAccess,
        openAccessStatus: f.openAccessStatus ?? paper.openAccessStatus,
        citedByCount: f.citedByCount ?? paper.citedByCount,
        openalexId: f.openalexId ?? paper.openalexId,
        registrationUrl: paper.registrationUrl,
        registrationPlatform: paper.registrationPlatform,
        biasLevel: paper.biasLevel,
        openDataUrl: paper.openDataUrl,
        openCodeUrl: paper.openCodeUrl,
        openMaterialsUrl: paper.openMaterialsUrl,
        zoteroNotes: paper.zoteroNotes,
        jmirBadgeType: paper.jmirBadgeType,
        jmirBadgeCounterpartDoi: paper.jmirBadgeCounterpartDoi,
        tags: paper.tags,
        keywords: (f.keywords ?? paper.keywords).map((k) => k.toLowerCase().trim()),
      },
      userId,
      f.matchedByTitle
        ? {
            summary: `No DOI on file — matched by title to "${f.matchedByTitle.title}" (${Math.round(
              f.matchedByTitle.score * 100
            )}%) and set DOI ${f.doi}`,
          }
        : {}
    )

    return { success: true }
  }
)
