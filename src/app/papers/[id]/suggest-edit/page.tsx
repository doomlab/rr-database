import { notFound, redirect } from "next/navigation"
import db from "db"
import { Navbar } from "../../../components/Navbar"
import { getBlitzContext } from "../../../blitz-server"
import { SuggestEditForm } from "./SuggestEditForm"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const paper = await db.paper.findUnique({ where: { id: Number(id) }, select: { title: true } })
  return { title: paper ? `Suggest an edit — ${paper.title}` : "Suggest an edit" }
}

export default async function SuggestEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getBlitzContext()
  const userId = ctx.session.userId as number | undefined
  const isAdmin = ctx.session.role === "ADMIN" || ctx.session.role === "SUPER_ADMIN"

  if (!userId) redirect(`/login?next=/papers/${id}/suggest-edit`)

  const paper = await db.paper.findUnique({
    where: { id: Number(id) },
    include: { studyPaper: { select: { studyId: true } } },
  })
  if (!paper) notFound()

  // Only route back to the study page if the paper is actually confirmed —
  // a paper can keep a stale StudyPaper link after being rejected, and that
  // study page 404s once none of its papers are IMPORTED/APPROVED.
  const isConfirmed = paper.status === "IMPORTED" || paper.status === "APPROVED"
  const backHref =
    paper.studyPaper && isConfirmed ? `/studies/${paper.studyPaper.studyId}` : `/papers/${paper.id}`

  const initial = {
    title: paper.title,
    doi: paper.doi,
    abstract: paper.abstract,
    year: paper.year,
    venue: paper.venue,
    volume: paper.volume,
    issue: paper.issue,
    pages: paper.pages,
    publisher: paper.publisher,
    url: paper.url,
  }

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <Navbar />

      <div className="w-full px-10 py-10">
        <div className="w-[90%] mx-auto">
          <a href={backHref} className="text-sm text-base-content/50 hover:text-base-content mb-6 inline-block">
            ← Back to article
          </a>

          <h1 className="text-2xl font-bold leading-snug mb-1">Suggest an edit</h1>
          <p className="text-base-content/60 mb-8">
            {isAdmin
              ? "As an admin, changes you save here go live immediately."
              : "Your suggestion will be reviewed by an admin before it's applied."}
          </p>

          <SuggestEditForm paperId={paper.id} initial={initial} backHref={backHref} isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  )
}
