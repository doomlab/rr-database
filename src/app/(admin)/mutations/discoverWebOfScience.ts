import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { getUserWosApiKey } from "src/lib/apiKeyPool"
import { discoverWebOfScienceCandidates } from "src/lib/webOfScienceDiscovery"

const DiscoverWebOfScience = z.object({
  year: z.number().int(),
})

export default resolver.pipe(
  resolver.zod(DiscoverWebOfScience),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ year }, ctx) => {
    const userId = ctx.session.userId as number
    const apiKey = await getUserWosApiKey(userId)
    if (!apiKey) {
      throw new Error("Add your Web of Science API key on your Account page before searching.")
    }

    const label = `[wos:year:${year}]`

    const run = await db.pipelineRun.create({
      data: {
        step: "QUERY_WOS",
        status: "RUNNING",
        output: `${label} running…`,
        startedById: userId,
      },
    })

    try {
      const { found, total, created, skipped } = await discoverWebOfScienceCandidates(year, apiKey)
      const partial = found < total ? ` (only the first ${found} of ${total} matches were fetched)` : ""
      const output = `${label} ${found} found${partial}, ${created} new item(s) added for review, ${skipped} already in the database.`
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
