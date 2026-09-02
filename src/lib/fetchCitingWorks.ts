import { withOpenAlexApiKey } from "./openAlexApiKey"

const HEADERS = { "User-Agent": "mailto:buchananlab@gmail.com" }
const LIMIT = 50

export type CitingWork = {
  openalexId: string
  title: string | null
  year: number | null
  journal: string | null
  doi: string | null
}

// Live lookup of papers that cite this one (OpenAlex's "cites" filter), not persisted —
// unlike outgoing references (PaperCitation), most of the citing world isn't in our DB,
// so there's nothing worth storing beyond what's already cached in Paper.citedByCount.
export async function fetchCitingWorks(
  openalexId: string
): Promise<{ works: CitingWork[]; total: number | null }> {
  try {
    const res = await fetch(
      await withOpenAlexApiKey(
        `https://api.openalex.org/works?filter=cites:${encodeURIComponent(
          openalexId
        )}&per_page=${LIMIT}&sort=publication_year:desc&select=id,title,publication_year,primary_location,doi`
      ),
      { headers: HEADERS, next: { revalidate: 86400 } }
    )
    if (!res.ok) return { works: [], total: null }

    const data = await res.json()
    const works: CitingWork[] = (data.results ?? []).map((work: any) => ({
      openalexId: (work.id as string).replace("https://openalex.org/", ""),
      title: (work.title as string | null) ?? null,
      year: (work.publication_year as number | null) ?? null,
      journal: work.primary_location?.source?.display_name ?? null,
      doi: (work.doi as string | null) ?? null,
    }))
    const total: number | null = data.meta?.count ?? null

    return { works, total }
  } catch {
    return { works: [], total: null }
  }
}
