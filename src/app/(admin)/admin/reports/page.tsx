import db from "db"
import { ResolveButton } from "../../components/ResolveButton"
import resolveReport from "../../mutations/resolveReport"

export default async function ReportsQueuePage() {
  const reports = await db.paperReport.findMany({
    where: { resolved: false },
    include: {
      paper: { select: { id: true, title: true, studyPaper: { select: { studyId: true } } } },
      user: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">User reports</h1>
      <p className="text-base-content/60 mb-8">
        {reports.length} unresolved report{reports.length === 1 ? "" : "s"}
      </p>

      {reports.length === 0 ? (
        <p className="text-base-content/40">Nothing to review.</p>
      ) : (
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
      )}
    </div>
  )
}
