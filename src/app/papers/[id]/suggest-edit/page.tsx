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

export default async function SuggestEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ back?: string }>
}) {
  const { id } = await params
  const { back } = await searchParams
  const ctx = await getBlitzContext()
  const userId = ctx.session.userId as number | undefined
  const isAdmin = ctx.session.role === "ADMIN" || ctx.session.role === "SUPER_ADMIN"

  if (!userId) redirect(`/login?next=/papers/${id}/suggest-edit`)

  const paper = await db.paper.findUnique({
    where: { id: Number(id) },
    include: {
      studyPaper: { select: { studyId: true } },
      authors: { include: { author: true }, orderBy: { position: "asc" } },
    },
  })
  if (!paper) notFound()

  // Only route back to the study page if the paper is actually confirmed —
  // a paper can keep a stale StudyPaper link after being rejected, and that
  // study page 404s once none of its papers are IMPORTED/APPROVED.
  const isConfirmed = paper.status === "IMPORTED" || paper.status === "APPROVED"
  const backHref =
    back && isAdmin && back.startsWith("/")
      ? back
      : paper.studyPaper && isConfirmed
        ? `/studies/${paper.studyPaper.studyId}`
        : `/papers/${paper.id}`

  const initial = {
    title: paper.title,
    doi: paper.doi,
    url: paper.url,
    pdfUrl: paper.pdfUrl,
    abstract: paper.abstract,
    year: paper.year,
    venue: paper.venue,
    volume: paper.volume,
    issue: paper.issue,
    pages: paper.pages,
    publisher: paper.publisher,
    issn: paper.issn,
    language: paper.language,
    itemType: paper.itemType,
    openAccess: paper.openAccess,
    openAccessStatus: paper.openAccessStatus,
    citedByCount: paper.citedByCount,
    openalexId: paper.openalexId,
    registrationUrl: paper.registrationUrl,
    registrationPlatform: paper.registrationPlatform,
    biasLevel: paper.biasLevel,
    openDataUrl: paper.openDataUrl,
    openCodeUrl: paper.openCodeUrl,
    openMaterialsUrl: paper.openMaterialsUrl,
    zoteroNotes: paper.zoteroNotes,
    jmirBadgeType: paper.jmirBadgeType,
    jmirBadgeCounterpartDoi: paper.jmirBadgeCounterpartDoi,
    tags: paper.tags.join(", "),
    keywords: paper.keywords.join(", "),
  }

  const initialAuthors = paper.authors.map((pa) => ({
    id: pa.author.id,
    name: pa.author.name,
    orcid: pa.author.orcid,
    openalexAuthorId: pa.author.openalexAuthorId,
  }))

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <Navbar />

      <div className="w-full px-10 py-10">
        <div className="w-[90%] mx-auto">
          <a href={backHref} className="text-sm text-base-content/50 hover:text-base-content mb-6 inline-block">
            ← Back to article
          </a>

          <h1 className="text-2xl font-bold leading-snug mb-1">
            {isAdmin ? "Edit metadata" : "Suggest an edit"}
          </h1>
          <p className="text-base-content/60 mb-8">
            {isAdmin
              ? "As an admin, changes you save here go live immediately."
              : "Your suggestion will be reviewed by an admin before it's applied."}
          </p>

          <SuggestEditForm
            paperId={paper.id}
            initial={initial}
            initialAuthors={initialAuthors}
            backHref={backHref}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </div>
  )
}
