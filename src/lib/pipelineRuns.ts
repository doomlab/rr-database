import db from "db"

export async function lastZoteroRun(prefix: string) {
  return db.pipelineRun.findFirst({
    where: { step: "PULL_ZOTERO", output: { startsWith: prefix } },
    orderBy: { createdAt: "desc" },
    include: { startedBy: { select: { name: true, email: true } } },
  })
}
