import { getOpenAlexApiKey } from "./apiKeyPool"

// OpenAlex bills per call beyond a modest daily free quota; an API key
// raises that quota. Pulls from the pool of the shared env key plus any
// user-contributed keys, no-op if none are configured.
export async function withOpenAlexApiKey(url: string): Promise<string> {
  const key = await getOpenAlexApiKey()
  if (!key) return url
  return `${url}${url.includes("?") ? "&" : "?"}api_key=${key}`
}
