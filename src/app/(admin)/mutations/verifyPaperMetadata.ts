import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const VerifyPaperMetadata = z.object({
  paperIds: z.array(z.number()).min(1),
  verified: z.boolean(),
})

export default resolver.pipe(
  resolver.zod(VerifyPaperMetadata),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ paperIds, verified }, ctx) => {
    const userId = ctx.session.userId as number

    await db.paper.updateMany({
      where: { id: { in: paperIds } },
      data: verified
        ? { metadataVerifiedAt: new Date(), metadataVerifiedById: userId }
        : { metadataVerifiedAt: null, metadataVerifiedById: null },
    })

    await db.paperEditHistory.createMany({
      data: paperIds.map((paperId) => ({
        paperId,
        userId,
        source: "workflow",
        summary: verified ? "Metadata marked verified" : "Metadata verification cleared",
      })),
    })

    return { success: true }
  }
)
