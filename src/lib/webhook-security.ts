import crypto from "node:crypto"

export function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8")
  const bufB = Buffer.from(b, "utf8")
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader) return false
  if (!signatureHeader.startsWith("sha256=")) return false
  const provided = signatureHeader.slice("sha256=".length)
  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex")
  return timingSafeEqualStr(provided, expected)
}

export function verifyTelegramSecret(
  header: string | null,
  expected: string | undefined
): boolean {
  if (!expected) return false
  if (!header) return false
  return timingSafeEqualStr(header, expected)
}

const EMAIL_MAX = 254
const MESSAGE_MAX = 4096

export function clampText(input: unknown, max: number = MESSAGE_MAX): string {
  if (typeof input !== "string") return ""
  return input.slice(0, max)
}

export function normalizeEmail(input: string): string | null {
  const trimmed = input.trim().toLowerCase().slice(0, EMAIL_MAX)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null
  return trimmed
}
