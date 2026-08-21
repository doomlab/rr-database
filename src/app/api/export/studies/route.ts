import { NextRequest } from "next/server"
import db from "db"
import {
  parseStudyFilterQueryString,
  buildStudyWhere,
  CONFIRMED_STATUSES,
  STAGE1_ROLES,
  STAGE2_ROLES,
  MATERIALS_ROLES,
} from "src/lib/studyFilters"
import { OA_STATUS_OPTIONS } from "src/lib/openAccessStatus"

const OA_STATUS_LABELS: Record<string, string> = Object.fromEntries(OA_STATUS_OPTIONS.map((o) => [o.value, o.label]))

function primaryPaper(papers: { role: string; paper: any }[]) {
  return (
    papers.find((p) => p.role === "STAGE2_ARTICLE")?.paper ??
    papers.find((p) => p.role === "STAGE1_ARTICLE")?.paper ??
    papers[0]?.paper
  )
}

function csvCell(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value)
  return `"${str.replace(/"/g, '""')}"`
}

export async function GET(request: NextRequest) {
  const filters = parseStudyFilterQueryString(request.nextUrl.searchParams.toString())
  const studyWhere = await buildStudyWhere(filters)

  const studies = await db.study.findMany({
    where: studyWhere,
    include: {
      papers: {
        where: { paper: { status: { in: CONFIRMED_STATUSES } } },
        include: {
          paper: {
            include: { authors: { include: { author: true }, orderBy: { position: "asc" } } },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  const header = [
    "Title",
    "Authors",
    "Year",
    "Venue",
    "DOI",
    "URL",
    "Stage",
    "Materials",
    "Open access status",
    "Metadata verified",
    "Keywords",
    "Database link",
  ]

  const rows = studies
    .map((study) => {
      const paper = primaryPaper(study.papers)
      if (!paper) return null
      const hasStage1 = study.papers.some((p) => (STAGE1_ROLES as string[]).includes(p.role))
      const hasStage2 = study.papers.some((p) => (STAGE2_ROLES as string[]).includes(p.role))
      const hasMaterials = study.papers.some((p) => (MATERIALS_ROLES as string[]).includes(p.role))
      const stageLabel = hasStage1 && hasStage2 ? "Stage 1 + 2" : hasStage1 ? "Stage 1" : hasStage2 ? "Stage 2" : ""
      const oaStatusLabel = paper.openAccessStatus
        ? OA_STATUS_LABELS[paper.openAccessStatus.toLowerCase()] ?? paper.openAccessStatus
        : ""
      const authors = paper.authors.map((pa: any) => pa.author.name).join("; ")
      const keywords = (paper.keywords ?? []).join("; ")
      const url = `${request.nextUrl.origin}/studies/${study.id}`

      return [
        csvCell(paper.title),
        csvCell(authors),
        csvCell(paper.year),
        csvCell(paper.venue),
        csvCell(paper.doi),
        csvCell(paper.url),
        csvCell(stageLabel),
        csvCell(hasMaterials ? "Yes" : "No"),
        csvCell(oaStatusLabel),
        csvCell(paper.metadataVerifiedAt ? "Yes" : "No"),
        csvCell(keywords),
        csvCell(url),
      ].join(",")
    })
    .filter((row): row is string => row !== null)

  const csv = [header.map(csvCell).join(","), ...rows].join("\r\n")

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rr-database-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
