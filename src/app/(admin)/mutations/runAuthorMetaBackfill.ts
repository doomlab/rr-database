import { resolver } from "@blitzjs/rpc"
import db from "db"
import { userHasOpenAlexApiKey } from "src/lib/apiKeyPool"
import { backfillAuthorMeta } from "src/lib/backfillAuthorMeta"

const LABEL = "[author-meta-backfill]"

export default resolver.pipe(resolver.authorize(["ADMIN", "SUPER_ADMIN"]), async (_input, ctx) => {
  const userId = ctx.session.userId as number
  const hasKey = await userHasOpenAlexApiKey(userId)
  if (!hasKey) {
    throw new Error("Add your OpenAlex API key on your Account page before running this.")
  }

  const run = await db.pipelineRun.create({
    data: { step: "ENRICH", status: "RUNNING", output: `${LABEL} running…`, startedById: userId },
  })

  try {
    const { papersChecked, authorsUpdated } = await backfillAuthorMeta()
    const output = `${LABEL} checked ${papersChecked} paper(s), filled in ORCID/OpenAlex IDs for ${authorsUpdated} author(s).`
    return db.pipelineRun.update({ where: { id: run.id }, data: { status: "DONE", output } })
  } catch (e: any) {
    await db.pipelineRun.update({
      where: { id: run.id },
      data: { status: "FAILED", output: `${LABEL} ${e.message ?? "Backfill failed"}` },
    })
    throw e
  }
})
