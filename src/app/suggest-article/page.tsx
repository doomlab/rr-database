import { redirect } from "next/navigation"
import { Navbar } from "../components/Navbar"
import { getBlitzContext } from "../blitz-server"
import { SuggestArticleForm } from "./SuggestArticleForm"

export const metadata = { title: "Suggest an article – RR Database" }

export default async function SuggestArticlePage() {
  const ctx = await getBlitzContext()
  const userId = ctx.session.userId as number | undefined

  if (!userId) redirect("/login?next=/suggest-article")

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <Navbar />

      <div className="w-full px-10 py-10">
        <div className="w-[90%] mx-auto">
          <a href="/" className="text-sm text-base-content/50 hover:text-base-content mb-6 inline-block">
            ← Back to browse
          </a>

          <h1 className="text-2xl font-bold leading-snug mb-1">Suggest an article</h1>
          <p className="text-base-content/60 mb-8">
            Can't find a registered report in the database? Let us know and an admin will review it.
          </p>

          <SuggestArticleForm />
        </div>
      </div>
    </div>
  )
}
