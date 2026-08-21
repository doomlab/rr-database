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

// PDFs start with "%PDF-" — cheap way to tell a real PDF apart from an HTML
// landing page or error page that a stored pdfUrl sometimes actually points
// to, before handing it to the parser (which throws an opaque error on
// anything else).
function looksLikePdf(buffer: Uint8Array): boolean {
  return (
    buffer.length >= 5 &&
    buffer[0] === 0x25 && // %
    buffer[1] === 0x50 && // P
    buffer[2] === 0x44 && // D
    buffer[3] === 0x46 && // F
    buffer[4] === 0x2d // -
  )
}

async function parsePdfBuffer(buffer: Uint8Array): Promise<string> {
  if (!looksLikePdf(buffer)) {
    throw new Error(
      "That doesn't look like a real PDF file (it's probably a landing page or login wall instead of the actual document). Try the PDF upload option below."
    )
  }
  const { PDFParse } = await import("pdf-parse")
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return result.text
  } catch {
    // pdfjs throws all kinds of internal, non-actionable errors on malformed/
    // encrypted/image-only PDFs — surface something a human can act on instead.
    throw new Error(
      "Couldn't read text from this PDF — it may be corrupted, password-protected, or a scanned image with no text layer."
    )
  } finally {
    await parser.destroy()
  }
}

export async function scanPdfText(pdfUrl: string): Promise<string> {
  const res = await fetch(pdfUrl, { headers: { "User-Agent": "Mozilla/5.0" } })
  if (!res.ok) throw new Error(`Failed to fetch PDF (${res.status})`)
  const buffer = new Uint8Array(await res.arrayBuffer())
  return parsePdfBuffer(buffer)
}

// Scans one paper's PDF on demand — deliberately not a batch job, since
// fetching + parsing a PDF is slow and we don't want this running over
// hundreds of papers automatically. Triggered from a button on that paper's
// own view page. Pass `uploadedPdf` to scan a file the admin picked instead
// of fetching paper.pdfUrl (e.g. when the stored URL isn't a real PDF).
export async function scanOpenSciencePracticesForPaper(
  paperId: number,
  uploadedPdf?: Uint8Array
): Promise<{ found: boolean }> {
  const paper = await db.paper.findUnique({
    where: { id: paperId },
    select: { pdfUrl: true, registrationUrl: true },
  })
  if (!paper) throw new Error("Paper not found.")

  let text: string
  if (uploadedPdf) {
    text = await parsePdfBuffer(uploadedPdf)
  } else if (paper.pdfUrl) {
    text = await scanPdfText(paper.pdfUrl)
  } else {
    throw new Error("This paper has no PDF URL to scan — upload a PDF instead.")
  }

  const result = classifyLinks(text)

  const data: Record<string, unknown> = { openSciencePracticesScannedAt: new Date() }
  if (result.openDataUrl) data.openDataUrl = result.openDataUrl
  if (result.openCodeUrl) data.openCodeUrl = result.openCodeUrl
  if (result.openMaterialsUrl) data.openMaterialsUrl = result.openMaterialsUrl
  // Only fill registrationUrl if this paper doesn't already have one — never
  // overwrite a real, already-known registration link.
  if (result.registrationUrl && !paper.registrationUrl) {
    data.registrationUrl = result.registrationUrl
  }

  await db.paper.update({ where: { id: paperId }, data })

  return {
    found: !!(result.openDataUrl || result.openCodeUrl || result.openMaterialsUrl || result.registrationUrl),
  }
}
