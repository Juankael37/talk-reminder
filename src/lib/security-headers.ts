const CSP_DIRECTIVES: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'"],
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "connect-src": [
    "'self'",
    "https://*.supabase.co",
    "https://api.resend.com",
    "https://graph.facebook.com",
    "https://api.telegram.org",
  ],
  "frame-ancestors": ["'none'"],
  "form-action": ["'self'"],
  "base-uri": ["'self'"],
  "object-src": ["'none'"],
}

function buildCsp(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([k, v]) => `${k} ${v.join(" ")}`)
    .join("; ")
}

const STATIC_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "X-DNS-Prefetch-Control": "off",
}

export function applySecurityHeaders(headers: Headers): void {
  for (const [k, v] of Object.entries(STATIC_HEADERS)) {
    if (!headers.has(k)) headers.set(k, v)
  }
  if (!headers.has("Content-Security-Policy")) {
    headers.set("Content-Security-Policy", buildCsp())
  }
}
