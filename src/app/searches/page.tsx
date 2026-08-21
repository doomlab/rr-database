import { redirect } from "next/navigation"
import { Navbar } from "../components/Navbar"
import { DeleteSavedSearchButton } from "../components/DeleteSavedSearchButton"
import { getBlitzContext } from "../blitz-server"
import db from "db"
import { parseStudyFilterQueryString, describeStudyFilters, buildStudyWhere } from "src/lib/studyFilters"

export default async function SearchesPage() {
  const ctx = await getBlitzContext()
  const userId = ctx.session.userId as number | undefined
  if (!userId) redirect("/login?next=/searches")

  const savedSearches = await db.savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })

  const rows = await Promise.all(
    savedSearches.map(async (s) => {
      const filters = parseStudyFilterQueryString(s.query)
      const where = await buildStudyWhere(filters)
      const count = await db.study.count({ where })
      return {
        ...s,
        count,
        chips: describeStudyFilters(filters),
        viewHref: s.query ? `/?${s.query}` : "/",
        exportHref: s.query ? `/api/export/studies?${s.query}` : "/api/export/studies",
      }
    })
  )

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <Navbar />

      <div className="flex-1 w-full px-10 py-8">
        <div className="w-[90%] mx-auto">
          <h1 className="text-2xl font-semibold mb-1">My Searches</h1>
          <p className="text-base-content/60 mb-8">{savedSearches.length} saved</p>

          {rows.length === 0 ? (
            <div className="text-center py-16 text-base-content/40">
              <p className="text-lg">No saved searches yet.</p>
              <a href="/" className="link link-primary text-sm mt-2 inline-block">
                Search the database
              </a>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-base-200">
              {rows.map((row) => (
                <li key={row.id} className="py-5 px-3 -mx-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-base leading-snug mb-1">{row.name}</h2>
                      {row.chips.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {row.chips.map((chip, i) => (
                            <span key={i} className="badge badge-outline">
                              {chip}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-base text-base-content/40 mb-2">No filters — all results</p>
                      )}
                      <p className="text-base text-base-content/60">
                        <span className="font-semibold text-base-content">{row.count}</span> report
                        {row.count === 1 ? "" : "s"} match right now
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a href={row.viewHref} className="btn btn-primary btn-sm">
                        View results
                      </a>
                      <a href={row.exportHref} className="btn btn-accent btn-sm">
                        Download CSV
                      </a>
                      <DeleteSavedSearchButton id={row.id} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
