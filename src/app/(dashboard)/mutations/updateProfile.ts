import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { name, email } from "../../(auth)/validations"
import { encryptApiKey } from "../../../lib/apiKeyEncryption"

const apiKey = z
  .string()
  .max(200)
  .transform((str) => str.trim())
  .transform((str) => (str.length === 0 ? null : str))
  .nullable()

const UpdateProfile = z.object({
  name,
  email,
  openAlexApiKey: apiKey.optional(),
})

export default resolver.pipe(
  resolver.zod(UpdateProfile),
  resolver.authorize(),
  async ({ name, email, openAlexApiKey }, ctx) => {
    const userId = ctx.session.userId as number

    const existing = await db.user.findFirst({ where: { email, NOT: { id: userId } } })
    if (existing) {
      throw new Error("That email is already in use by another account.")
    }

    const user = await db.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        ...(openAlexApiKey !== undefined && {
          openAlexApiKey: openAlexApiKey ? encryptApiKey(openAlexApiKey) : null,
        }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        openAlexApiKey: true,
      },
    })
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      hasOpenAlexApiKey: !!user.openAlexApiKey,
    }
  }
)
