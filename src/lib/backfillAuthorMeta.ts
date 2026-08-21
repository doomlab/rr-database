import db from "db"
import { withOpenAlexApiKey } from "./openAlexApiKey"

const HEADERS = { "User-Agent": "mailto:buchananlab@gmail.com" }
const BATCH_SIZE = 50

function shortOpenAlexId(id: string): string | null {
  const match = id.match(/W\d+/)
  return match ? match[0] : null
}

// Re-fetches authorship data (ORCID / OpenAlex author id) for papers that
// already have an openalexId but whose authors are still missing that data
// — covers papers imported before Author.orcid/openalexAuthorId existed.
// Fill-if-empty: never overwrites an Author row that already has a value.
export async function backfillAuthorMeta(): Promise<{ papersChecked: number; authorsUpdated: number }> {
  const papers = await db.paper.findMany({
    where: {
      openalexId: { not: null },
      authors: { some: { author: { orcid: null, openalexAuthorId: null } } },
    },
    select: {
      openalexId: true,
      authors: { include: { author: true } },
    },
  })

  let authorsUpdated = 0

  for (let i = 0; i < papers.length; i += BATCH_SIZE) {
    const batch = papers.slice(i, i + BATCH_SIZE)
    const shortIds = batch
      .map((p) => shortOpenAlexId(p.openalexId!))
      .filter((id): id is string => !!id)
    if (shortIds.length === 0) continue

    const res = await fetch(
      await withOpenAlexApiKey(
        `https://api.openalex.org/works?filter=ids.openalex:${shortIds.join("|")}&select=id,authorships&per-page=${shortIds.length}`
      ),
      { headers: HEADERS }
    )
    if (!res.ok) continue
    const { results } = await res.json()

    const worksById = new Map<string, any>(
      (results ?? []).map((w: any) => [shortOpenAlexId(w.id) ?? w.id, w])
    )

    for (const paper of batch) {
      const shortId = shortOpenAlexId(paper.openalexId!)
      const work = shortId ? worksById.get(shortId) : null
      if (!work) continue

      const authorshipsByName = new Map<string, any>(
        (work.authorships ?? []).map((a: any) => [
          (a.author?.display_name ?? "").trim().toLowerCase(),
          a,
        ])
      )

      for (const pa of paper.authors) {
        if (pa.author.orcid || pa.author.openalexAuthorId) continue
        const authorship = authorshipsByName.get(pa.author.name.trim().toLowerCase())
        if (!authorship) continue

        const orcid: string | null = authorship.author?.orcid ?? null
        const openalexAuthorId: string | null = authorship.author?.id
          ? String(authorship.author.id).replace("https://openalex.org/", "")
          : null
        if (!orcid && !openalexAuthorId) continue

        try {
          await db.author.update({
            where: { id: pa.author.id },
            data: {
              ...(orcid ? { orcid } : {}),
              ...(openalexAuthorId ? { openalexAuthorId } : {}),
            },
          })
          authorsUpdated++
        } catch {
          // openalexAuthorId collided with another Author row (likely the
          // same person under two name spellings) — skip rather than fail
          // the whole backfill.
        }
      }
    }
  }

  return { papersChecked: papers.length, authorsUpdated }
}
