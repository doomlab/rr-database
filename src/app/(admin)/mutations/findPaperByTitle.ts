import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { findMatchingPaper } from "src/lib/duplicateClusters"
import { userHasOpenAlexApiKey } from "src/lib/apiKeyPool"
import { findWorksByTitle } from "src/lib/titleLookup"

const FindPaperByTitle = z.object({
  title: z.string().trim().min(1),
  authors: z.array(z.string()).optional(),
})

// Looks up candidate DOIs for a title with no DOI. Nothing is saved — the
// admin picks a candidate (or none) and continues through the normal flow.
export default resolver.pipe(
  resolver.zod(FindPaperByTitle),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ title, authors }, ctx) => {
    const userId = ctx.session.userId as number
    const useOpenAlex = await userHasOpenAlexApiKey(userId)

    const [{ candidates, errors }, existing] = await Promise.all([
      findWorksByTitle(title, { authors, useOpenAlex }),
      findMatchingPaper(title),
    ])

    return {
      candidates,
      errors,
      searchedOpenAlex: useOpenAlex,
      existing: existing ? { id: existing.id, title: existing.title } : null,
    }
  }
)
