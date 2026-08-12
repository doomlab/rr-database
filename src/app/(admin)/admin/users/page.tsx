import db from "db"
import { getBlitzContext } from "../../../blitz-server"
import { UserRoleSelect } from "../../components/UserRoleSelect"

export default async function UsersPage() {
  const ctx = await getBlitzContext()
  const isSuperAdmin = ctx.session.role === "SUPER_ADMIN"

  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Users</h1>
      <p className="text-base-content/60 mb-8">{users.length} total</p>

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
    </div>
  )
}
