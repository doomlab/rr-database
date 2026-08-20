import { redirect } from "next/navigation"
import { Navbar } from "../components/Navbar"
import { getBlitzContext } from "../blitz-server"
import db from "db"
import { AccountForm } from "./AccountForm"

export const metadata = { title: "Account – RR Database" }

export default async function AccountPage() {
  const ctx = await getBlitzContext()
  const userId = ctx.session.userId as number | undefined

  if (!userId) redirect("/login?next=/account")

  const user = await db.user.findFirst({
    where: { id: userId },
    select: { name: true, email: true },
  })

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <Navbar />

      <div className="w-full px-10 py-10">
        <div className="w-[90%] mx-auto">
          <h1 className="text-2xl font-bold leading-snug mb-1">Account</h1>
          <p className="text-base-content/60 mb-8">Update your profile details.</p>

          <AccountForm initialName={user?.name ?? ""} email={user?.email ?? ""} />
        </div>
      </div>
    </div>
  )
}
