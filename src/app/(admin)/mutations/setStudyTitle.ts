import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"

const SetStudyTitle = z.object({
  studyId: z.number(),
  // Blank or null clears the custom title, going back to the paper's title.
  title: z.string().trim().max(500).nullable(),
})

export default resolver.pipe(
  resolver.zod(SetStudyTitle),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async ({ studyId, title }) => {
    await db.study.update({ where: { id: studyId }, data: { title: title || null } })
    return { success: true }
  }
)
