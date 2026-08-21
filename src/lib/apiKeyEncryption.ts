import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const TAG_LENGTH = 16

function getKey(): Buffer {
  const secret = process.env.API_KEY_ENCRYPTION_KEY
  if (!secret) {
    throw new Error(
      "API_KEY_ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32` and add it to .env.local."
    )
  }
  const key = Buffer.from(secret, "base64")
  if (key.length !== 32) {
    throw new Error("API_KEY_ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded).")
  }
  return key
}

// User-contributed API keys (OpenAlex) are stored encrypted at rest —
// they're secrets we need to send back out on the user's behalf, so hashing
// doesn't apply here; we need the plaintext back, hence symmetric encryption.
// Buffer/Uint8Array casts below work around a type-only mismatch between this
// project's @types/node version and the crypto typings' generic ArrayBuffer
// constraint — Buffer is a valid BinaryLike/CipherKey at runtime.

function concat(chunks: Buffer[]): Buffer {
  return Buffer.concat(chunks as unknown as Uint8Array<ArrayBuffer>[])
}

export function encryptApiKey(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey() as any, iv as any)
  const ciphertext = concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return concat([iv, tag, ciphertext]).toString("base64")
}

export function decryptApiKey(encoded: string): string | null {
  try {
    const raw = Buffer.from(encoded, "base64")
    const iv = raw.subarray(0, IV_LENGTH)
    const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
    const ciphertext = raw.subarray(IV_LENGTH + TAG_LENGTH)
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey() as any, iv as any)
    decipher.setAuthTag(tag as any)
    return concat([decipher.update(ciphertext as any), decipher.final()]).toString("utf8")
  } catch {
    return null
  }
}
