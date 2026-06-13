import { logger } from "./logger"

export type SentryStub = {
  captureException: (err: unknown, ctx?: Record<string, unknown>) => void
  captureMessage: (msg: string, ctx?: Record<string, unknown>) => void
}

function makeNoop(): SentryStub {
  return {
    captureException: () => {},
    captureMessage: () => {},
  }
}

let stub: SentryStub = makeNoop()

export function initSentry(opts: { dsn?: string; sink?: typeof logger } = {}): SentryStub {
  if (!opts.dsn) {
    stub = makeNoop()
    return stub
  }
  stub = {
    captureException(err, ctx) {
      opts.sink?.error("sentry.captureException", { ctx, message: err instanceof Error ? err.message : String(err) })
    },
    captureMessage(msg, ctx) {
      opts.sink?.warn("sentry.captureMessage", { ctx, message: msg })
    },
  }
  return stub
}

export function getSentry(): SentryStub {
  return stub
}
