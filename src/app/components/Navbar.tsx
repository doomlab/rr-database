import Link from "next/link"
import db from "db"
import { getBlitzContext } from "../blitz-server"
import { LogoutButton } from "../(auth)/components/LogoutButton"
import { ThemeToggle } from "./ThemeToggle"
import { countLinkNeedsReviewGroups } from "src/lib/duplicateClusters"

export async function Navbar() {
  const ctx = await getBlitzContext()
  const userId = ctx.session.userId
  const role = ctx.session.role
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN"
  const isSuperAdmin = role === "SUPER_ADMIN"

  const [
    reviewCount,
    reportsCount,
    suggestionsCount,
    metadataCount,
    extractionCount,
    linkGroupCount,
    metadataReviewCount,
  ] = isAdmin
    ? await Promise.all([
        db.paper.count({ where: { status: "PENDING_REVIEW" } }),
        db.paperReport.count({ where: { resolved: false } }),
        db.articleSuggestion.count({ where: { resolved: false } }),
        db.metadataEditSuggestion.count({ where: { resolved: false } }),
        db.extractionEditSuggestion.count({ where: { resolved: false } }),
        countLinkNeedsReviewGroups(),
        db.paper.count({
          where: {
            canonicalPaperId: null,
            metadataVerifiedAt: null,
            OR: [
              { openSciencePracticesScannedAt: { not: null } },
              { jmirBadgeCheckedAt: { not: null } },
            ],
          },
        }),
      ])
    : [0, 0, 0, 0, 0, 0, 0]

  return (
    <div className="navbar bg-base-200 px-6 shadow-sm sticky top-0 z-50">
      <div className="flex-1 flex items-center gap-2">
        <Link href="/" className="text-xl font-bold">
          RR Database
        </Link>
      </div>
      <div className="flex-none flex items-center gap-2">
        <ThemeToggle />
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-primary btn-sm">
            Database ▾
          </div>
          <ul
            tabIndex={0}
            className="dropdown-content menu bg-base-100 rounded-box z-50 w-56 p-2 shadow-md border border-base-300 mt-1"
          >
            <li>
              <Link href="/">Search</Link>
            </li>
            <li>
              <Link href="/excluded">Excluded</Link>
            </li>
            {userId && (
              <li>
                <Link href="/favorites">★ My Favorites</Link>
              </li>
            )}
          </ul>
        </div>
        {userId ? (
          <>
            {isAdmin && (
              <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className="btn btn-secondary btn-sm">
                  Admin ▾
                </div>
                <ul
                  tabIndex={0}
                  className="dropdown-content menu bg-base-100 rounded-box z-50 w-56 p-2 shadow-md border border-base-300 mt-1"
                >
                  <li>
                    <Link href="/admin">Home</Link>
                  </li>
                  <li>
                    <Link href="/admin/stats">Stats</Link>
                  </li>
                  <li>
                    <Link href="/admin/review" className="flex justify-between">
                      <span>Review queue</span>
                      {reviewCount > 0 && <span className="badge badge-warning badge-sm">{reviewCount}</span>}
                    </Link>
                  </li>
                  <li>
                    <Link href="/admin/link" className="flex justify-between">
                      <span>Link papers</span>
                      {linkGroupCount > 0 && (
                        <span className="badge badge-warning badge-sm">{linkGroupCount}</span>
                      )}
                    </Link>
                  </li>
                  <li>
                    <Link href="/admin/metadata-review" className="flex justify-between">
                      <span>Metadata review</span>
                      {metadataReviewCount > 0 && (
                        <span className="badge badge-warning badge-sm">{metadataReviewCount}</span>
                      )}
                    </Link>
                  </li>
                  <li>
                    <Link href="/admin/reports" className="flex justify-between">
                      <span>User reports</span>
                      {reportsCount > 0 && <span className="badge badge-warning badge-sm">{reportsCount}</span>}
                    </Link>
                  </li>
                  <li>
                    <Link href="/admin/suggestions" className="flex justify-between">
                      <span>Article suggestions</span>
                      {suggestionsCount > 0 && <span className="badge badge-warning badge-sm">{suggestionsCount}</span>}
                    </Link>
                  </li>
                  <li>
                    <Link href="/admin/metadata" className="flex justify-between">
                      <span>Metadata edits</span>
                      {metadataCount > 0 && <span className="badge badge-warning badge-sm">{metadataCount}</span>}
                    </Link>
                  </li>
                  <li>
                    <Link href="/admin/extraction" className="flex justify-between">
                      <span>Extraction edits</span>
                      {extractionCount > 0 && <span className="badge badge-warning badge-sm">{extractionCount}</span>}
                    </Link>
                  </li>
                  <li>
                    <Link href="/admin/users">Users</Link>
                  </li>
                  <li>
                    <Link href="/admin/api-keys">API keys</Link>
                  </li>
                  {isSuperAdmin && (
                    <li>
                      <Link href="/admin/database">Database</Link>
                    </li>
                  )}
                </ul>
              </div>
            )}
            <Link href="/account" className="btn btn-info btn-sm">
              Account
            </Link>
            <LogoutButton />
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn-accent btn-sm">
              Log in
            </Link>
            <Link href="/signup" className="btn btn-secondary btn-sm">
              Sign up
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
