import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { userHasOpenAlexApiKey } from "src/lib/apiKeyPool"
import { discoverOpenAlexCandidates } from "src/lib/openAlexDiscovery"

const DiscoverOpenAlex = z.object({
  mode: z.enum(["year", "recent"]),
  year: z.number().int().optional(),
})

export default resolver.pipe(
  resolver.zod(DiscoverOpenAlex),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async (input, ctx) => {
    const userId = ctx.session.userId as number
    const hasKey = await userHasOpenAlexApiKey(userId)
    if (!hasKey) {
      throw new Error("Add your OpenAlex API key on your Account page before searching.")
    }

    const now = new Date()
    let fromDate: string
    let toDate: string
    let label: string

    if (input.mode === "year") {
      if (input.year == null) throw new Error("A year is required for this mode.")
      fromDate = `${input.year}-01-01`
      toDate = `${input.year}-12-31`
      label = `[openalex:year:${input.year}]`
    } else {
      const twoYearsAgo = new Date(now)
      twoYearsAgo.setFullYear(now.getFullYear() - 2)
      fromDate = twoYearsAgo.toISOString().slice(0, 10)
      toDate = now.toISOString().slice(0, 10)
      label = `[openalex:recent]`
    }

    const run = await db.pipelineRun.create({
      data: {
        step: "QUERY_OPENALEX",
        status: "RUNNING",
        output: `${label} running…`,
        startedById: userId,
      },
    })

    try {
      const { found, created, skipped } = await discoverOpenAlexCandidates(fromDate, toDate)
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
