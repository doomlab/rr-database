import { redirect } from "next/navigation"
import { getBlitzContext } from "../blitz-server"
import { Navbar } from "../components/Navbar"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getBlitzContext()
  const role = ctx.session.role

  if (!ctx.session.userId) redirect("/login")
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/")

  return (
    <div className="min-h-screen bg-base-100">
      <Navbar />
      <main className="w-[90%] mx-auto px-6 py-10">{children}</main>
    </div>
  )
}
