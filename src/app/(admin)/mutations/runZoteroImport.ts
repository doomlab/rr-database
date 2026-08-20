import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { importProductionLibrary, importStagingCollections } from "src/lib/zoteroImport"

const RunZoteroImport = z.object({
  target: z.enum(["production", "stagingCollections"]),
})

export default resolver.pipe(
  resolver.zod(RunZoteroImport),
  resolver.authorize(["SUPER_ADMIN"]),
  async ({ target }, ctx) => {
    const run = await db.pipelineRun.create({
      data: {
        step: "PULL_ZOTERO",
        status: "RUNNING",
        output: `[${target}] running…`,
        startedById: ctx.session.userId as number,
      },
    })

    try {
      let output: string
      if (target === "production") {
        const { imported, skipped } = await importProductionLibrary()
        output = `[production] Upserted ${imported} paper(s), skipped ${skipped} non-bibliographic item(s).`
      } else {
        const totals = await importStagingCollections()
        const parts = Object.entries(totals).map(([name, count]) => `${name}: ${count}`)
        output = `[stagingCollections] ${parts.join(", ") || "no matching collections found"}`
      }

      return db.pipelineRun.update({
        where: { id: run.id },
        data: { status: "DONE", output },
      })
    } catch (e: any) {
      await db.pipelineRun.update({
        where: { id: run.id },
        data: { status: "FAILED", output: `[${target}] ${e.message ?? "Import failed"}` },
      })
      throw e
    }
  }
)
