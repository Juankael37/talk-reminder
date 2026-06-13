type EnvSpec = {
  key: string
  required: boolean
  serverOnly: boolean
}

const SPEC: EnvSpec[] = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', required: true, serverOnly: false },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true, serverOnly: false },
  { key: 'NEXT_PUBLIC_TIMEZONE', required: false, serverOnly: false },

  { key: 'SUPABASE_SERVICE_ROLE_KEY', required: true, serverOnly: true },
  { key: 'RESEND_API_KEY', required: false, serverOnly: true },
  { key: 'MESSENGER_PAGE_ACCESS_TOKEN', required: false, serverOnly: true },
  { key: 'MESSENGER_VERIFY_TOKEN', required: false, serverOnly: true },
  { key: 'MESSENGER_APP_SECRET', required: false, serverOnly: true },
  { key: 'TELEGRAM_BOT_TOKEN', required: false, serverOnly: true },
  { key: 'CRON_SECRET', required: true, serverOnly: true },
  { key: 'TELEGRAM_WEBHOOK_SECRET', required: false, serverOnly: true },
]

let cached: Record<string, string | undefined> | null = null
const warned: Set<string> = new Set()

function load(): Record<string, string | undefined> {
  if (cached) return cached
  const out: Record<string, string | undefined> = {}
  for (const { key } of SPEC) {
    out[key] = process.env[key]
  }
  cached = out
  return out
}

function missingPublic(): string[] {
  const env = load()
  return SPEC
    .filter((s) => s.required && !s.serverOnly && !env[s.key])
    .map((s) => s.key)
}

function missingServer(): string[] {
  const env = load()
  return SPEC
    .filter((s) => s.required && s.serverOnly && !env[s.key])
    .map((s) => s.key)
}

export function assertPublicEnv(): void {
  const missing = missingPublic()
  if (missing.length) {
    throw new Error(
      `[env] Missing required public env vars: ${missing.join(', ')}`
    )
  }
}

export function assertServerEnv(): void {
  const missing = missingServer()
  if (missing.length) {
    throw new Error(
      `[env] Missing required server env vars: ${missing.join(', ')}`
    )
  }
}

export function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`[env] Missing required env var: ${key}`)
  }
  return value
}

export function getOptionalEnv(key: string): string | undefined {
  return process.env[key]
}

export function warnIfMissingServer(key: string): void {
  if (warned.has(key)) return
  if (!process.env[key]) {
    warned.add(key)
    console.warn(`[env] Optional env var not set: ${key}`)
  }
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}
