import db from "db"
import { getBlitzContext } from "../../../blitz-server"
import { UserRoleSelect } from "../../components/UserRoleSelect"
import { Pagination } from "../../../components/Pagination"

const PAGE_SIZE = 50

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const ctx = await getBlitzContext()
  const isSuperAdmin = ctx.session.role === "SUPER_ADMIN"

  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const [users, totalUsers] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      skip,
      take: PAGE_SIZE,
    }),
    db.user.count(),
  ])

  const totalPages = Math.ceil(totalUsers / PAGE_SIZE)
  const buildHref = (p: number) => `/admin/users?page=${p}`

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Users</h1>
      <p className="text-base-content/60 mb-8">{totalUsers} total</p>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Joined</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.name ?? "—"}</td>
                <td>{u.createdAt.toLocaleDateString()}</td>
                <td>
                  <UserRoleSelect userId={u.id} role={u.role} canEdit={isSuperAdmin} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  )
}
