import { resolver } from "@blitzjs/rpc"
import { z } from "zod"
import db from "db"
import { name } from "../../(auth)/validations"
import { encryptApiKey } from "../../../lib/apiKeyEncryption"

const apiKey = z
  .string()
  .max(200)
  .transform((str) => str.trim())
  .transform((str) => (str.length === 0 ? null : str))
  .nullable()

const UpdateProfile = z.object({
  name,
  openAlexApiKey: apiKey.optional(),
  groqApiKey: apiKey.optional(),
})

export default resolver.pipe(
  resolver.zod(UpdateProfile),
  resolver.authorize(),
  async ({ name, openAlexApiKey, groqApiKey }, ctx) => {
    const userId = ctx.session.userId as number
    const user = await db.user.update({
      where: { id: userId },
      data: {
        name,
        ...(openAlexApiKey !== undefined && {
          openAlexApiKey: openAlexApiKey ? encryptApiKey(openAlexApiKey) : null,
        }),
        ...(groqApiKey !== undefined && {
          groqApiKey: groqApiKey ? encryptApiKey(groqApiKey) : null,
        }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        openAlexApiKey: true,
        groqApiKey: true,
      },
    })
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      hasOpenAlexApiKey: !!user.openAlexApiKey,
      hasGroqApiKey: !!user.groqApiKey,
    }
  }
)
