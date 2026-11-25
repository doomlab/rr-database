import type { Prisma } from "db"

export type AuthorLookup = {
  // Set when the caller is directly editing a known Author row.
  id?: number | null
  name: string
  orcid?: string | null
  openalexAuthorId?: string | null
}

// Author.name and Author.openalexAuthorId are both unique, and one person can
// already exist under a different spelling than the source now returns (e.g.
// "J. Smith" imported earlier, "John Smith" from OpenAlex). So match on the
// OpenAlex ID first, then on the name, and only create a new row when neither
// finds anyone — otherwise a create/update trips a unique constraint.
//
// Existing rows are only ever filled in, never overwritten by a lookup that
// matched them indirectly; a directly-edited row (`id`) is overwritten, unless
// that would collide with a different author, in which case that one is used.
export async function findOrCreateAuthor(client: Prisma.TransactionClient, a: AuthorLookup) {
  const name = a.name.trim()
  const orcid = a.orcid ?? null
  const openalexAuthorId = a.openalexAuthorId ?? null

  const fillBlanks = async (existing: { id: number; orcid: string | null; openalexAuthorId: string | null }) => {
    const data = {
      ...(orcid && !existing.orcid ? { orcid } : {}),
      ...(openalexAuthorId && !existing.openalexAuthorId ? { openalexAuthorId } : {}),
    }
    return Object.keys(data).length > 0
      ? client.author.update({ where: { id: existing.id }, data })
      : existing
  }

  const byOpenAlexId = openalexAuthorId
    ? await client.author.findUnique({ where: { openalexAuthorId } })
    : null
  if (byOpenAlexId && byOpenAlexId.id !== a.id) return fillBlanks(byOpenAlexId)

  const byName = await client.author.findUnique({ where: { name } })
  if (byName && byName.id !== a.id) return fillBlanks(byName)

  if (a.id) {
    return client.author.update({ where: { id: a.id }, data: { name, orcid, openalexAuthorId } })
  }
  return client.author.create({ data: { name, orcid, openalexAuthorId } })
}
