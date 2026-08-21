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

// One row per year that's ever been pulled via a "Pull a specific year"
// button — most recent run per year, so the UI can show "last pulled" per
// year rather than just overall. `labelPrefix` is the run's `[source:year:`
// tag (e.g. "openalex", "scholar"); PENDING_REVIEW candidates created by
// that run are tagged with the matching discoveredVia source.
async function yearRunHistory(
  step: PipelineStep,
  labelPrefix: string
): Promise<Record<number, { createdAt: string; status: string }>> {
  const runs = await db.pipelineRun.findMany({
    where: { step, output: { startsWith: `[${labelPrefix}:year:` } },
    orderBy: { createdAt: "desc" },
    select: { output: true, createdAt: true, status: true },
  })

  const byYear: Record<number, { createdAt: string; status: string }> = {}
  for (const run of runs) {
    const match = run.output?.match(new RegExp(`^\\[${labelPrefix}:year:(\\d+)\\]`))
    if (!match) continue
    const year = Number(match[1])
    if (!(year in byYear)) {
      byYear[year] = { createdAt: run.createdAt.toISOString(), status: run.status }
    }
  }
  return byYear
}

export function openAlexYearRunHistory() {
  return yearRunHistory("QUERY_OPENALEX", "openalex")
}

export function googleScholarYearRunHistory() {
  return yearRunHistory("QUERY_GOOGLE_SCHOLAR", "scholar")
}
