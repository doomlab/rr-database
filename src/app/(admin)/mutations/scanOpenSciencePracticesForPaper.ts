import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import { scanOpenSciencePracticesForPaper } from "src/lib/openSciencePractices"

const ScanPaper = z.object({ paperId: z.number() })

export default resolver.pipe(
  resolver.zod(ScanPaper),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ paperId }) => {
    return scanOpenSciencePracticesForPaper(paperId)
  }
)
