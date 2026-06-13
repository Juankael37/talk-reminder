import { isProduction } from "./env"

type Level = "debug" | "info" | "warn" | "error"

type LogEvent = {
  level: Level
  event: string
  ts: string
  meta?: Record<string, unknown>
}

const REDACT_KEYS = new Set([
  "password",
  "token",
  "access_token",
  "psid",
  "sender_psid",
  "chat_id",
  "telegram_chat_id",
  "messenger_psid",
  "email",
  "speaker_email",
  "speaker_name",
  "authorization",
])

function redact(value: unknown): unknown {
  if (value == null) return value
  if (typeof value === "string") {
    if (value.length > 200) return `${value.slice(0, 200)}…[truncated]`
    if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(value)) {
      const [local, domain] = value.split("@")
      return `${local[0] ?? "*"}***@${domain}`
    }
    return value
  }
  if (Array.isArray(value)) return value.map(redact)
  if (typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = REDACT_KEYS.has(k.toLowerCase()) ? "[redacted]" : redact(v)
    }
    return out
  }
  return value
}

function emit(event: LogEvent): void {
  if (isProduction() && event.level === "debug") return
  const stream =
    event.level === "error" || event.level === "warn" ? "stderr" : "stdout"
  const payload = JSON.stringify({
    ...event,
    meta: event.meta ? redact(event.meta) : undefined,
  })
  if (stream === "stderr") {
    process.stderr.write(payload + "\n")
  } else {
    process.stdout.write(payload + "\n")
  }
}

export const logger = {
  debug(event: string, meta?: Record<string, unknown>): void {
    emit({ level: "debug", event, ts: new Date().toISOString(), meta })
  },
  info(event: string, meta?: Record<string, unknown>): void {
    emit({ level: "info", event, ts: new Date().toISOString(), meta })
  },
  warn(event: string, meta?: Record<string, unknown>): void {
    emit({ level: "warn", event, ts: new Date().toISOString(), meta })
  },
  error(event: string, meta?: Record<string, unknown>): void {
    emit({ level: "error", event, ts: new Date().toISOString(), meta })
  },
}
