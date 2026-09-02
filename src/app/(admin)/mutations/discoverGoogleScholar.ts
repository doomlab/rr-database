import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { discoverGoogleScholarCandidates } from "src/lib/googleScholarDiscovery"

const DiscoverGoogleScholar = z.object({
  year: z.number().int(),
})

export default resolver.pipe(
  resolver.zod(DiscoverGoogleScholar),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ year }, ctx) => {
    const userId = ctx.session.userId as number
    const label = `[scholar:year:${year}]`

    const run = await db.pipelineRun.create({
      data: {
        step: "QUERY_GOOGLE_SCHOLAR",
        status: "RUNNING",
        output: `${label} running…`,
        startedById: userId,
      },
    })

    try {
      const { found, created, skipped } = await discoverGoogleScholarCandidates(year)
      const output = `${label} ${found} found, ${created} new paper(s) added for review, ${skipped} already in the database.`
      return db.pipelineRun.update({ where: { id: run.id }, data: { status: "DONE", output } })
    } catch (e: any) {
      await db.pipelineRun.update({
        where: { id: run.id },
        data: { status: "FAILED", output: `${label} ${e.message ?? "Search failed"}` },
      })
      throw e
    }
  }
)
