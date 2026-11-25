import { resolver } from "@blitzjs/rpc"
import db from "db"
import { discoverLifecycleJournalCandidates } from "src/lib/lifecycleJournalDiscovery"

const LABEL = "[lifecycle]"

export default resolver.pipe(resolver.authorize(["ADMIN", "SUPER_ADMIN"]), async (_input, ctx) => {
  const userId = ctx.session.userId as number

  const run = await db.pipelineRun.create({
    data: { step: "QUERY_LIFECYCLE", status: "RUNNING", output: `${LABEL} running…`, startedById: userId },
  })

  try {
    const { found, created, skipped } = await discoverLifecycleJournalCandidates()
    const output = `${LABEL} ${found} found, ${created} new item(s) added for review, ${skipped} already in the database.`
    return db.pipelineRun.update({ where: { id: run.id }, data: { status: "DONE", output } })
  } catch (e: any) {
    await db.pipelineRun.update({
      where: { id: run.id },
      data: { status: "FAILED", output: `${LABEL} ${e.message ?? "Pull failed"}` },
    })
    throw e
  }
})
