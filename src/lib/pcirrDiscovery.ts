import db, { Prisma } from "db"
import { findMatchingPaper } from "./duplicateClusters"
import { upsertAuthors } from "./zoteroImport"

// PCI RR publishes an RSS-style feed of every recommended study (title is
// generic boilerplate, but it carries the recommendation DOI/URL, recommender
// and date). The study's real title, stage, authors, report link and Stage 1
// protocol link are only on the article page itself.
const FEED_URL = "https://rr.peercommunityin.org/PCIRegisteredReports/rss/rss4bioRxiv"
const REQUEST_DELAY_MS = 1000

type FeedItem = {
  pcirrId: string
  recommendationUrl: string
  recommendationDoi: string | null
  recommender: string | null
  reviewers: string | null
  recommendedAt: Date | null
}

type PcirrArticle = {
  title: string | null
  stage: "STAGE_1" | "STAGE_2" | null
  authors: string[]
  reportUrl: string | null
  stage1ProtocolUrl: string | null
  biasLevel: string | null
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
}

const stripTags = (s: string) => decodeEntities(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim()

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))
  return m ? decodeEntities(m[1]!.trim()) || null : null
}

export function parseFeed(xml: string): FeedItem[] {
  const items: FeedItem[] = []
  for (const [, resource] of xml.matchAll(/<resource>([\s\S]*?)<\/resource>/g)) {
    const url = tag(resource!, "url")
    const pcirrId = url?.match(/[?&]id=(\d+)/)?.[1]
    if (!url || !pcirrId) continue
    const date = tag(resource!, "date")
    const parsed = date ? new Date(`${date} UTC`) : null
    items.push({
      pcirrId,
      recommendationUrl: url,
      recommendationDoi: tag(resource!, "doi")?.toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, "") ?? null,
      recommender: tag(resource!, "recommender"),
      reviewers: tag(resource!, "reviewers"),
      recommendedAt: parsed && !isNaN(parsed.getTime()) ? parsed : null,
    })
  }
  return items
}

// OSF "view_only" links carry a private access token meant for reviewers —
// don't store that in a record that's shown publicly.
function publicUrl(url: string): string {
  try {
    const u = new URL(url)
    u.searchParams.delete("view_only")
    return u.toString()
  } catch {
    return url
  }
}

export function parseArticle(html: string): PcirrArticle {
  const title = html.match(/<h1>([\s\S]*?)<\/h1>/)?.[1]
  const infoSpans = Array.from(html.matchAll(/<span class="pci2-article-infos"[^>]*>([\s\S]*?)<\/span>(?=\s*<)/g)).map(
    (m) => m[1]!
  )

  const stageText = infoSpans.map(stripTags).find((t) => /^stage [12]$/i.test(t))
  const stage = stageText ? (stageText.endsWith("1") ? "STAGE_1" : "STAGE_2") : null

  // Authors are the first plain-text info span: not the stage badge, not a
  // link (report URL), not empty.
  const authorSpan = infoSpans.find((s) => !/<b>|<a /.test(s) && stripTags(s))
  const authors = authorSpan
    ? stripTags(authorSpan)
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
    : []

  const reportUrl = html.match(/<a class="doi_url" href="([^"]+)"/)?.[1]
  const protocol = html.match(/URL to the preregistered Stage 1 protocol:\s*<\/strong>\s*<a href="([^"]+)"/i)?.[1]
  const bias = html.match(/Level of bias control achieved:<\/strong>\s*<a[^>]*>(Level \d+)/i)?.[1]

  return {
    title: title ? stripTags(title) : null,
    stage,
    authors,
    reportUrl: reportUrl ? publicUrl(decodeEntities(reportUrl)) : null,
    stage1ProtocolUrl: protocol ? publicUrl(decodeEntities(protocol)) : null,
    biasLevel: bias ?? null,
  }
}

function doiFromUrl(url: string | null): string | null {
  const m = url?.match(/^https?:\/\/(?:dx\.)?doi\.org\/(10\..+)$/i)
  return m ? m[1]!.toLowerCase() : null
}

async function get(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; rr-database discovery)" },
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) throw new Error(`PCI RR returned ${res.status} for ${url}`)
  return res.text()
}

// Finds the paper already in the database for a PCI RR study: by report DOI,
// else by title. A title match that is itself a PCI RR commentary document
// (recommendation/review/etc., which carry a `role`) is not the study.
async function findExistingPaper(doi: string | null, title: string) {
  const select = {
    id: true,
    stage: true,
    registrationUrl: true,
    url: true,
    pcirrMetadata: true,
    discoveredVia: true,
    _count: { select: { authors: true } },
  } satisfies Prisma.PaperSelect

  if (doi) {
    const byDoi = await db.paper.findFirst({ where: { doi }, select })
    if (byDoi) return byDoi
  }
  const match = await findMatchingPaper(title)
  if (!match) return null
  const paper = await db.paper.findUnique({ where: { id: match.id }, select })
  const meta = paper?.pcirrMetadata as { role?: string } | null
  return meta?.role ? null : paper
}

export async function discoverPcirrCandidates(
  year: number,
  userId: number
): Promise<{ found: number; created: number; updated: number; skipped: number }> {
  const feed = parseFeed(await get(FEED_URL)).filter((i) => i.recommendedAt?.getUTCFullYear() === year)

  let created = 0
  let updated = 0
  let skipped = 0

  for (const item of feed) {
    const alreadyImported = await db.paper.findFirst({
      where: { pcirrMetadata: { path: ["pcirrId"], equals: item.pcirrId } },
      select: { id: true },
    })
    if (alreadyImported) {
      skipped++
      continue
    }

    await sleep(REQUEST_DELAY_MS)
    const article = parseArticle(await get(item.recommendationUrl))
    if (!article.title) {
      skipped++
      continue
    }

    const doi = doiFromUrl(article.reportUrl)
    const pcirrMetadata = {
      pcirrId: item.pcirrId,
      recommendationUrl: item.recommendationUrl,
      recommendationDoi: item.recommendationDoi,
      recommender: item.recommender,
      reviewers: item.reviewers,
      recommendedAt: item.recommendedAt?.toISOString() ?? null,
      biasLevel: article.biasLevel,
    }

    const existing = await findExistingPaper(doi, article.title)
    if (existing) {
      // Only fill gaps — never overwrite what's already on the paper, since
      // it may have been reviewed, edited or enriched since it was imported.
      const patch: Prisma.PaperUpdateInput = {}
      if (!existing.stage && article.stage) patch.stage = article.stage
      if (!existing.registrationUrl && article.stage1ProtocolUrl) patch.registrationUrl = article.stage1ProtocolUrl
      if (!existing.url && article.reportUrl) patch.url = article.reportUrl
      if (!existing.pcirrMetadata) patch.pcirrMetadata = pcirrMetadata
      if (!existing.discoveredVia.includes("PCIRR")) patch.discoveredVia = { push: "PCIRR" }

      const fields = Object.keys(patch)
      if (fields.length === 0) {
        skipped++
        continue
      }
      await db.paper.update({ where: { id: existing.id }, data: patch })
      if (existing._count.authors === 0 && article.authors.length > 0) {
        await upsertAuthors(
          existing.id,
          article.authors.map((name) => ({ name, orcid: null, openalexAuthorId: null }))
        )
      }
      await db.paperEditHistory.create({
        data: {
          paperId: existing.id,
          userId,
          source: "pcirr",
          summary: `PCI RR discovery filled in: ${fields.join(", ")}`,
        },
      })
      updated++
      continue
    }

    const paper = await db.paper.create({
      data: {
        title: article.title,
        doi,
        year,
        url: article.reportUrl,
        stage: article.stage,
        registrationUrl: article.stage1ProtocolUrl,
        status: "PENDING_REVIEW",
        discoveredVia: ["PCIRR"],
        pcirrMetadata,
      },
    })
    await upsertAuthors(
      paper.id,
      article.authors.map((name) => ({ name, orcid: null, openalexAuthorId: null }))
    )
    created++
  }

  return { found: feed.length, created, updated, skipped }
}
