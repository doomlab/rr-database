import db, { PipelineStep } from "db"

export async function lastPipelineRun(step: PipelineStep, prefix: string) {
  return db.pipelineRun.findFirst({
    where: { step, output: { startsWith: prefix } },
    orderBy: { createdAt: "desc" },
    include: { startedBy: { select: { name: true, email: true } } },
  })
}

export async function lastZoteroRun(prefix: string) {
  return lastPipelineRun("PULL_ZOTERO", prefix)
}

// One row per year that's ever been pulled via "Pull a specific year"
// (openAlexYear label is `[openalex:year:YYYY]`) — most recent run per year,
// so the UI can show "last pulled" per year rather than just overall.
export async function openAlexYearRunHistory(): Promise<Record<number, { createdAt: string; status: string }>> {
  const runs = await db.pipelineRun.findMany({
    where: { step: "QUERY_OPENALEX", output: { startsWith: "[openalex:year:" } },
    orderBy: { createdAt: "desc" },
    select: { output: true, createdAt: true, status: true },
  })

  const byYear: Record<number, { createdAt: string; status: string }> = {}
  for (const run of runs) {
    const match = run.output?.match(/^\[openalex:year:(\d+)\]/)
    if (!match) continue
    const year = Number(match[1])
    if (!(year in byYear)) {
      byYear[year] = { createdAt: run.createdAt.toISOString(), status: run.status }
    }
  }
  return byYear
}
