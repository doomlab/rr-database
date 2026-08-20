import db from "db"

// Domains that plausibly host data/code/materials/preregistrations. Kept
// broad on purpose — the keyword-context check below is what decides which
// bucket a link goes in, not the domain by itself.
const LINK_RE =
  /https?:\/\/(?:osf\.io|github\.com|gitlab\.com|zenodo\.org|figshare\.com|dataverse\.[a-z.]+|datadryad\.org|aspredicted\.org|researchbox\.org)\/\S+/gi

const CODE_DOMAINS = /github\.com|gitlab\.com/i
const PREREG_KEYWORDS = /pre[- ]?regist(er|ration)/i
const DATA_KEYWORDS = /data\s+(is|are|was|were)?\s*(availab|access)|availability of data|dataset/i
const MATERIALS_KEYWORDS = /materials?\s+(is|are|was|were)?\s*(availab|access)|availability of materials|study materials/i
const CODE_KEYWORDS = /code\s+(is|are|was|were)?\s*(availab|access)|availability of code|analysis (code|script)/i

function stripTrailingPunctuation(url: string): string {
  return url.replace(/[.,;:)\]]+$/, "")
}

// Looks at a window of text around each link to guess what kind of resource
// it is. A link can match more than one bucket if the surrounding language
// is ambiguous (e.g. an OSF page holding "data and materials").
function classifyLinks(text: string): {
  openDataUrl: string | null
  openCodeUrl: string | null
  openMaterialsUrl: string | null
  registrationUrl: string | null
} {
  let openDataUrl: string | null = null
  let openCodeUrl: string | null = null
  let openMaterialsUrl: string | null = null
  let registrationUrl: string | null = null

  const matches = Array.from(text.matchAll(LINK_RE))
  for (const match of matches) {
    const url = stripTrailingPunctuation(match[0])
    const start = Math.max(0, (match.index ?? 0) - 200)
    const end = Math.min(text.length, (match.index ?? 0) + match[0].length + 200)
    const context = text.slice(start, end)

    if (CODE_DOMAINS.test(url) || CODE_KEYWORDS.test(context)) {
      openCodeUrl ??= url
    }
    if (DATA_KEYWORDS.test(context)) {
      openDataUrl ??= url
    }
    if (MATERIALS_KEYWORDS.test(context)) {
      openMaterialsUrl ??= url
    }
    if (PREREG_KEYWORDS.test(context)) {
      registrationUrl ??= url
    }
  }

  return { openDataUrl, openCodeUrl, openMaterialsUrl, registrationUrl }
}

export async function scanPdfText(pdfUrl: string): Promise<string> {
  const res = await fetch(pdfUrl, { headers: { "User-Agent": "Mozilla/5.0" } })
  if (!res.ok) throw new Error(`Failed to fetch PDF (${res.status})`)
  const buffer = new Uint8Array(await res.arrayBuffer())
  const { PDFParse } = await import("pdf-parse")
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return result.text
  } finally {
    await parser.destroy()
  }
}

export async function scanOpenSciencePractices(): Promise<{
  scanned: number
  found: number
  failed: number
}> {
  const papers = await db.paper.findMany({
    where: {
      pdfUrl: { not: null },
      openSciencePracticesScannedAt: null,
      status: { in: ["IMPORTED", "APPROVED"] },
    },
    select: { id: true, pdfUrl: true, registrationUrl: true },
  })

  let scanned = 0
  let found = 0
  let failed = 0

  for (const paper of papers) {
    try {
      const text = await scanPdfText(paper.pdfUrl!)
      const result = classifyLinks(text)

      const data: Record<string, unknown> = { openSciencePracticesScannedAt: new Date() }
      if (result.openDataUrl) data.openDataUrl = result.openDataUrl
      if (result.openCodeUrl) data.openCodeUrl = result.openCodeUrl
      if (result.openMaterialsUrl) data.openMaterialsUrl = result.openMaterialsUrl
      // Only fill registrationUrl if this paper doesn't already have one —
      // never overwrite a real, already-known registration link.
      if (result.registrationUrl && !paper.registrationUrl) {
        data.registrationUrl = result.registrationUrl
      }

      await db.paper.update({ where: { id: paper.id }, data })

      scanned++
      if (result.openDataUrl || result.openCodeUrl || result.openMaterialsUrl || result.registrationUrl) {
        found++
      }
    } catch {
      failed++
      await db.paper.update({
        where: { id: paper.id },
        data: { openSciencePracticesScannedAt: new Date() },
      })
    }
  }

  return { scanned, found, failed }
}
