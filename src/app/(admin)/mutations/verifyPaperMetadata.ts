import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const VerifyPaperMetadata = z.object({ paperId: z.number() })

export default resolver.pipe(
  resolver.zod(VerifyPaperMetadata),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ paperId }, ctx) => {
    const userId = ctx.session.userId as number
    return db.paper.update({
      where: { id: paperId },
      data: { metadataVerifiedById: userId, metadataVerifiedAt: new Date() },
    })
  }
)
