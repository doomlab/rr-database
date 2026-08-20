import { resolver } from "@blitzjs/rpc"
import db from "db"
import { scanOpenSciencePractices } from "src/lib/openSciencePractices"

const LABEL = "[open-science-scan]"

export default resolver.pipe(resolver.authorize(["ADMIN", "SUPER_ADMIN"]), async (_input, ctx) => {
  const userId = ctx.session.userId as number

  const run = await db.pipelineRun.create({
    data: { step: "ENRICH", status: "RUNNING", output: `${LABEL} running…`, startedById: userId },
  })

  try {
    const { scanned, found, failed } = await scanOpenSciencePractices()
    const output = `${LABEL} ${scanned} paper(s) scanned, ${found} with at least one link found, ${failed} failed.`
    return db.pipelineRun.update({ where: { id: run.id }, data: { status: "DONE", output } })
  } catch (e: any) {
    await db.pipelineRun.update({
      where: { id: run.id },
      data: { status: "FAILED", output: `${LABEL} ${e.message ?? "Scan failed"}` },
    })
    throw e
  }
})
