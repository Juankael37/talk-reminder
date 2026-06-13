import { NextResponse } from "next/server"
import { rateLimit, clientIpFromHeaders, type RateLimitConfig } from "./rate-limit"
import { logger } from "./logger"

export function methodNotAllowed(allow: string[]): NextResponse {
  return new NextResponse("Method Not Allowed", {
    status: 405,
    headers: { Allow: allow.join(", ") },
  })
}

export function rateLimited(resetAt: number): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))
  return new NextResponse("Too Many Requests", {
    status: 429,
    headers: { "Retry-After": String(retryAfter) },
  })
}

export function applyRateLimit(
  request: Request,
  route: string,
  config: Omit<RateLimitConfig, "key">
): { allowed: boolean; response?: NextResponse } {
  const ip = clientIpFromHeaders(request.headers)
  const result = rateLimit({ ...config, key: `${route}:${ip}` })
  if (!result.allowed) {
    logger.warn("rate_limit.exceeded", { route, ip })
    return { allowed: false, response: rateLimited(result.resetAt) }
  }
  return { allowed: true }
}

export function genericError(route: string, err: unknown): NextResponse {
  const message = err instanceof Error ? err.message : "internal_error"
  logger.error("api.error", { route, message })
  return NextResponse.json({ error: "Internal server error" }, { status: 500 })
}
