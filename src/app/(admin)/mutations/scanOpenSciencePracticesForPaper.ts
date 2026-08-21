import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { scanOpenSciencePracticesForPaper } from "src/lib/openSciencePractices"

// ~20MB of base64 text, comfortably covering any real paper PDF.
const MAX_BASE64_LENGTH = 28_000_000

const ScanPaper = z.object({
  paperId: z.number(),
  pdfBase64: z.string().max(MAX_BASE64_LENGTH).optional(),
})

export default resolver.pipe(
  resolver.zod(ScanPaper),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ paperId, pdfBase64 }) => {
    const uploadedPdf = pdfBase64 ? new Uint8Array(Buffer.from(pdfBase64, "base64")) : undefined
    return scanOpenSciencePracticesForPaper(paperId, uploadedPdf)
  }
)
