import { resolver } from "@blitzjs/rpc"
import db from "db"
import { AddPaperInput, resolvePaperForAdd } from "src/lib/addPaperInput"

// Brings one more paper into the workflow's current group: an existing paper
// picked from search, a DOI (looked up on Crossref if it isn't in the
// database yet), or a bare title for something with no DOI. New papers start
// as PENDING_REVIEW; linking them with a role approves them, like every
// other paper in the Link step.
const select = {
  id: true,
  title: true,
  year: true,
  venue: true,
  doi: true,
  status: true,
  stage: true,
  studyPaper: { select: { role: true } },
  authors: { select: { author: { select: { name: true } } }, orderBy: { position: "asc" } },
} as const

export default resolver.pipe(
  resolver.zod(AddPaperInput),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async (input) => {
    const paperId = await resolvePaperForAdd(input)

    const paper = await db.paper.findUnique({ where: { id: paperId }, select })
    if (!paper) throw new Error(`No item with ID #${paperId} exists.`)
    return paper
  }
)
