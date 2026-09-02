import db from "db"
import { upsertAuthors } from "./zoteroImport"

export function normalizeDoi(raw: string): string {
  return raw.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim().toLowerCase()
}

// Finds a paper by DOI, or creates one from Crossref data as PENDING_REVIEW
// if it's not already in the database. Shared by any flow that needs to
// pull in a paper it only has a DOI for (JMIR badge counterparts, admin-
// approved article suggestions, etc).
export async function fetchOrCreatePaperByDoi(
  doi: string,
  opts: { discoveredVia?: "ZOTERO_IMPORT" | "OPENALEX" | "GOOGLE_SCHOLAR" | "PCIRR" | "USER_SUGGESTION" } = {}
): Promise<{ id: number; title: string; created: boolean }> {
  const existing = await db.paper.findFirst({ where: { doi }, select: { id: true, title: true } })
  if (existing) return { ...existing, created: false }

  const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
    headers: { "User-Agent": "mailto:buchananlab@gmail.com" },
  })
  if (!res.ok) throw new Error(`Could not find DOI ${doi} on Crossref (${res.status})`)
  const { message } = await res.json()

  const title: string = message.title?.[0] ?? "Untitled"
  const paper = await db.paper.create({
    data: {
      title,
      doi,
      year: message.issued?.["date-parts"]?.[0]?.[0] ?? null,
      venue: message["container-title"]?.[0] ?? null,
      publisher: message.publisher ?? null,
      volume: message.volume ?? null,
      issue: message.issue ?? null,
      pages: message.page ?? null,
      status: "PENDING_REVIEW",
      ...(opts.discoveredVia ? { discoveredVia: [opts.discoveredVia] } : {}),
    },
  })

  const authorNames: string[] = (message.author ?? [])
    .map((a: { given?: string; family?: string }) => [a.given, a.family].filter(Boolean).join(" "))
    .filter((n: string) => n.length > 0)
  await upsertAuthors(paper.id, authorNames)

  return { id: paper.id, title, created: true }
}
