import db from "db"
import { decryptApiKey } from "./apiKeyEncryption"

// Round-robins across the shared env key (if set) plus every user-contributed
// key, so a burst of enrichment calls spreads across more than one account's
// rate limit. Best-effort: the index resets on server restart and isn't
// shared across multiple app instances.
const indexes: Record<string, number> = {}

async function nextKey(field: "openAlexApiKey", envKey?: string): Promise<string | null> {
  const users = await db.user.findMany({
    where: { [field]: { not: null } },
    select: { [field]: true },
  })
  const decrypted = users
    .map((u) => decryptApiKey((u as any)[field] as string))
    .filter((k): k is string => k !== null)
  const keys = [...(envKey ? [envKey] : []), ...decrypted]
  if (keys.length === 0) return null

  const i = indexes[field] ?? 0
  indexes[field] = (i + 1) % keys.length
  return keys[i % keys.length] ?? null
}

export function getOpenAlexApiKey(): Promise<string | null> {
  return nextKey("openAlexApiKey", process.env.OPENALEX_API_KEY)
}

// Pulling from OpenAlex is gated on the requesting admin having contributed
// their own key (see /admin/api-keys) — this checks that specific user, not
// the pool as a whole.
export async function userHasOpenAlexApiKey(userId: number): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { openAlexApiKey: true } })
  return !!user?.openAlexApiKey
}
