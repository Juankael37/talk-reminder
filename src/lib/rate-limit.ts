type Bucket = { count: number; resetAt: number }

const BUCKETS = new Map<string, Bucket>()

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
}

export type RateLimitConfig = {
  key: string
  limit: number
  windowMs: number
}

export function rateLimit(config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const bucket = BUCKETS.get(config.key)
  if (!bucket || bucket.resetAt <= now) {
    const next: Bucket = { count: 1, resetAt: now + config.windowMs }
    BUCKETS.set(config.key, next)
    return { allowed: true, remaining: config.limit - 1, resetAt: next.resetAt }
  }
  if (bucket.count >= config.limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt }
  }
  bucket.count += 1
  return {
    allowed: true,
    remaining: config.limit - bucket.count,
    resetAt: bucket.resetAt,
  }
}

export function clientIpFromHeaders(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown"
  return headers.get("x-real-ip") || "unknown"
}
