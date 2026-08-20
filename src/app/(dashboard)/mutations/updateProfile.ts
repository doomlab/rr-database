import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { name } from "../../(auth)/validations"

const UpdateProfile = z.object({ name })

export default resolver.pipe(
  resolver.zod(UpdateProfile),
  resolver.authorize(),
  async ({ name }, ctx) => {
    const userId = ctx.session.userId as number
    const user = await db.user.update({
      where: { id: userId },
      data: { name },
      select: { id: true, name: true, email: true },
    })
    return user
  }
)
