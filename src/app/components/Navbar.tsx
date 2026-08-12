import Link from "next/link"
import { getBlitzContext } from "../blitz-server"
import { LogoutButton } from "../(auth)/components/LogoutButton"
import { ThemeToggle } from "./ThemeToggle"

export async function Navbar() {
  const ctx = await getBlitzContext()
  const userId = ctx.session.userId

  return (
    <div className="navbar bg-base-200 px-6 shadow-sm sticky top-0 z-50">
      <div className="flex-1 gap-4">
        <Link href="/" className="text-xl font-bold">
          RR Database
        </Link>
      </div>
      <div className="flex-none gap-2">
        <ThemeToggle />
        {userId ? (
          <>
            <Link href="/favorites" className="btn btn-ghost btn-sm mr-2">
              ★ My Favorites
            </Link>
            <LogoutButton />
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn-accent btn-sm m-2">
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
