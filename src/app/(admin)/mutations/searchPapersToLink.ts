import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const SearchPapersToLink = z.object({ q: z.string().min(2), excludePaperId: z.number().optional() })

// A pasted link rarely matches a stored one character for character (a
// /files/osfstorage tail, http vs https, a trailing slash), so for URLs also
// search on the host + first path segment — for OSF that's the project ID.
function urlNeedles(q: string): string[] {
  if (!/^https?:\/\//i.test(q)) return []
  const bare = q.replace(/^https?:\/\//i, "").replace(/[?#].*$/, "").replace(/\/+$/, "")
  const [host, first] = bare.split("/")
  return Array.from(new Set([bare, first ? `${host}/${first}` : bare]))
}

export default resolver.pipe(
  resolver.zod(SearchPapersToLink),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ q, excludePaperId }) => {
    const needles = [q, ...urlNeedles(q)]
    const urlFields = ["url", "registrationUrl", "openDataUrl", "openCodeUrl", "openMaterialsUrl"] as const

    return db.paper.findMany({
      where: {
        AND: [
          excludePaperId ? { id: { not: excludePaperId } } : {},
          {
            OR: needles.flatMap((needle) => [
              { title: { contains: needle, mode: "insensitive" as const } },
              { doi: { contains: needle, mode: "insensitive" as const } },
              ...urlFields.map((f) => ({ [f]: { contains: needle, mode: "insensitive" as const } })),
            ]),
          },
        ],
      },
      select: { id: true, title: true, year: true, doi: true },
      orderBy: { title: "asc" },
      take: 10,
    })
  }
)
