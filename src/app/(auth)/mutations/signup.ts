import { resolver } from "@blitzjs/rpc"
import db from "db"
import { SecurePassword } from "@blitzjs/auth/secure-password"
import { email, password, name } from "../validations"
import { z } from "zod"
import { Role } from "types"

const SignupInput = z.object({ name, email, password })

export default resolver.pipe(resolver.zod(SignupInput), async ({ name, email, password }, ctx) => {
  const hashedPassword = await SecurePassword.hash(password)
  const user = await db.user.create({
    data: { name, email, hashedPassword },
  })

  await ctx.session.$create({ userId: user.id, role: "USER" as Role })

  return { userId: ctx.session.userId, ...user }
})
