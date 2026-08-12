import db from "db"
import { ResolveButton } from "../../components/ResolveButton"
import { Pagination } from "../../../components/Pagination"
import resolveReport from "../../mutations/resolveReport"

const PAGE_SIZE = 50

export default async function ReportsQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const [reports, totalReports] = await Promise.all([
    db.paperReport.findMany({
      where: { resolved: false },
      include: {
        paper: { select: { id: true, title: true, studyPaper: { select: { studyId: true } } } },
        user: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    db.paperReport.count({ where: { resolved: false } }),
  ])

  const totalPages = Math.ceil(totalReports / PAGE_SIZE)
  const buildHref = (p: number) => `/admin/reports?page=${p}`

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">User reports</h1>
      <p className="text-base-content/60 mb-8">
        {totalReports} unresolved report{totalReports === 1 ? "" : "s"}
      </p>

      {reports.length === 0 ? (
        <p className="text-base-content/40">Nothing to review.</p>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-base-200">
            {reports.map((report) => (
              <li key={report.id} className="py-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {report.paper.studyPaper ? (
                    <a
                      href={`/studies/${report.paper.studyPaper.studyId}`}
                      className="font-semibold text-base leading-snug link"
                    >
                      {report.paper.title}
                    </a>
                  ) : (
                    <span className="font-semibold text-base leading-snug">{report.paper.title}</span>
                  )}
                  <p className="text-xs text-base-content/50 mt-1">
                    Reported by {report.user.email} — {report.reason}
                    {report.note ? `: "${report.note}"` : ""}
                  </p>
                </div>
                <ResolveButton mutation={resolveReport} input={{ reportId: report.id }} />
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
        </>
      )}
    </div>
  )
}
