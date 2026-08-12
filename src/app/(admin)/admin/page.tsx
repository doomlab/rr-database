import Link from "next/link"
import db from "db"

export default async function AdminHomePage() {
  const [
    totalPapers,
    importedCount,
    pendingReviewCount,
    approvedCount,
    rejectedCount,
    reportsCount,
    suggestionsCount,
    metadataCount,
    extractionCount,
    studiesCount,
    linkedStudiesCount,
    usersCount,
  ] = await Promise.all([
    db.paper.count(),
    db.paper.count({ where: { status: "IMPORTED" } }),
    db.paper.count({ where: { status: "PENDING_REVIEW" } }),
    db.paper.count({ where: { status: "APPROVED" } }),
    db.paper.count({ where: { status: "REJECTED" } }),
    db.paperReport.count({ where: { resolved: false } }),
    db.articleSuggestion.count({ where: { resolved: false } }),
    db.metadataEditSuggestion.count({ where: { resolved: false } }),
    db.extractionEditSuggestion.count({ where: { resolved: false } }),
    db.study.count(),
    db.study.count({ where: { papers: { some: {} } } }),
    db.user.count(),
  ])

  const cards = [
    { label: "Total papers", value: totalPapers },
    { label: "Imported (confirmed)", value: importedCount },
    { label: "Pending review", value: pendingReviewCount, href: "/admin/review" },
    { label: "Approved", value: approvedCount },
    { label: "Rejected", value: rejectedCount },
    { label: "Open reports", value: reportsCount, href: "/admin/reports" },
    { label: "Article suggestions", value: suggestionsCount, href: "/admin/suggestions" },
    { label: "Metadata edit suggestions", value: metadataCount, href: "/admin/metadata" },
    { label: "Extraction edit suggestions", value: extractionCount, href: "/admin/extraction" },
    { label: "Studies", value: studiesCount },
    { label: "Studies with a paper linked", value: linkedStudiesCount },
    { label: "Users", value: usersCount, href: "/admin/users" },
  ]

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-8">Admin</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => {
          const content = (
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body p-5">
                <p className="text-sm text-base-content/60">{c.label}</p>
                <p className="text-3xl font-bold">{c.value}</p>
              </div>
            </div>
          )
          return c.href ? (
            <Link key={c.label} href={c.href as any} className="hover:opacity-80 transition-opacity">
              {content}
            </Link>
          ) : (
            <div key={c.label}>{content}</div>
          )
        })}
      </div>
    </div>
  )
}
