import { resolver } from "@blitzjs/rpc"
import { SavePaperEdit, applyPaperEdit } from "src/lib/applyPaperEdit"

export default resolver.pipe(
  resolver.zod(SavePaperEdit),
  resolver.authorize(["ADMIN", "SUPER_ADMIN"]),
  async (input, ctx) => applyPaperEdit(input, ctx.session.userId as number)
)
