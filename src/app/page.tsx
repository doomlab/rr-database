import db from "db"

export default async function Home() {
  const statusCounts = await db.paper.groupBy({
    by: ["status"],
    _count: { _all: true },
    orderBy: { status: "asc" },
  })
  const totalPapers = statusCounts.reduce((sum, row) => sum + row._count._all, 0)

  return (
    <div className="min-h-screen bg-base-100 flex flex-col items-center px-10 py-16">
      <div className="max-w-2xl w-full">
        <h1 className="text-2xl font-semibold mb-1">RR Database</h1>
        <p className="text-base-content/60 mb-8">{totalPapers} papers imported so far</p>

        <ul className="flex flex-col divide-y divide-base-200">
          {statusCounts.map((row) => (
            <li key={row.status} className="py-3 flex items-center justify-between">
              <span className="badge badge-outline">{row.status}</span>
              <span className="font-mono text-sm">{row._count._all}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
