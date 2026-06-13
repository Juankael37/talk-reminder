# Talk Reminder — Security Checklist

> Generated after a full security audit pass. Use this as a living document — review before each deploy, and tick items off as they are completed or re-verified.

**Last reviewed:** 2026-06-13
**Scope:** `talk-reminder/` (Next.js 16 App Router + Supabase + Resend + Meta + Telegram)

---

## 1. Environment Variables & Secrets

- [x] **No secrets in source.** All credentials read via `process.env` inside server-only files. No raw tokens in any `.ts`/`.tsx` file under `src/`.
- [x] **Runtime env validation.** `src/lib/env.ts` exports `requireEnv`, `warnIfMissingServer`, `assertServerEnv`, `assertPublicEnv`. All API routes call `requireEnv` for required server-side keys.
- [x] **`NEXT_PUBLIC_` prefix discipline.** Confirmed by `grep`: `NEXT_PUBLIC_` is only used on `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TIMEZONE` — all non-sensitive.
- [x] **`.env.example` committed.** `talk-reminder/.env.example` lists every required env var with no values.
- [x] **`.env*` ignored.** `.gitignore` and `.vercelignore` both exclude `.env*`.

**Action required after deploy (do once):**
- [ ] Add `CRON_SECRET` to Vercel project env (Production + Preview).
- [ ] Add `TELEGRAM_WEBHOOK_SECRET` to Vercel project env.
- [ ] Re-register the Telegram webhook with the new secret via `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<URL>&secret_token=<TELEGRAM_WEBHOOK_SECRET>`.
- [ ] Update Vercel Cron schedule to hit `/api/check-reminders?secret=<CRON_SECRET>` (or `Authorization: Bearer <CRON_SECRET>` header).
- [ ] Update any external keep-alive pingers to include the same secret.

**Outstanding (intentionally out of scope this pass):**
- [ ] **CRITICAL — rotate `SUPABASE_SERVICE_ROLE_KEY` out of `vercel.json`.** The service-role JWT is currently committed in plaintext in `vercel.json` (the build-env block). Anyone with repo read access can use it to bypass RLS. Move to Vercel project env UI only and rotate the key in Supabase. Do not attempt without Supabase dashboard access.

---

## 2. HTTP Security Headers

Implemented in `src/lib/security-headers.ts` and applied by `src/middleware.ts` to every response (the middleware matcher excludes `_next/static`, `_next/image`, and image files — these are served by Vercel CDN with their own headers).

- [x] **Content-Security-Policy** — `default-src 'self'`, `script-src 'self' 'unsafe-inline'`, `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`, `font-src 'self' https://fonts.gstatic.com data:`, `img-src 'self' data: blob: https:`, `connect-src 'self' https://*.supabase.co https://api.resend.com https://graph.facebook.com https://api.telegram.org`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`.
- [x] **Strict-Transport-Security** — `max-age=63072000; includeSubDomains; preload`.
- [x] **X-Frame-Options** — `DENY`.
- [x] **X-Content-Type-Options** — `nosniff`.
- [x] **Referrer-Policy** — `strict-origin-when-cross-origin`.
- [x] **Permissions-Policy** — `camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()`.
- [x] **Cross-Origin-Opener-Policy** — `same-origin`.
- [x] **X-DNS-Prefetch-Control** — `off`.

**How to verify after deploy:**
```bash
curl -sI https://talk-reminder.vercel.app/dashboard | grep -iE 'content-security|strict-transport|x-frame|x-content|referrer|permissions|cross-origin'
```

---

## 3. API Route Protection

Applied to every route under `src/app/api/`. Implementation in `src/lib/api-guard.ts` + `src/lib/rate-limit.ts`.

- [x] **HTTP method validation.** Each route returns `405 Method Not Allowed` with an `Allow:` header for unexpected methods (`/api/check-reminders`, `/api/keep-alive`, `/api/delete-account`, `/api/messenger/webhook`, `/api/telegram/webhook`).
- [x] **Rate limiting.** In-memory token-bucket per route+IP. Limits:
  - `/api/check-reminders` — 6 req/min/IP
  - `/api/keep-alive` — 6 req/min/IP
  - `/api/delete-account` — 3 req/min/IP
  - `/api/messenger/webhook` GET — 10 req/min/IP
  - `/api/messenger/webhook` POST — 60 req/min/IP
  - `/api/telegram/webhook` POST — 60 req/min/IP
  - **Note:** in-memory limits are best-effort on Vercel serverless (each cold instance has its own bucket). Acceptable for current traffic; swap to Upstash/Redis when scaling.
- [x] **Generic error responses.** All API routes return `{ "error": "Internal server error" }` on caught exceptions. Details (Supabase error messages, stack traces, upstream provider error JSONs) are written to the server log via `logger.error` — never to the response.
- [x] **Input length caps.** Webhook text payloads capped at 320 chars before DB lookup. Outbound Messenger text capped at 2000 chars; Telegram text at 4000 chars.
- [x] **Email normalization.** `normalizeEmail()` regex-validates and trims; invalid email → bot reply asking for a valid one, no DB query.

---

## 4. Authentication & Authorization

Supabase Auth (email + password) is in use. The project does **not** use NextAuth.

- [x] **Server-side user verification on sensitive endpoints.** `/api/delete-account` uses `supabase.auth.getUser(token)` (server-verified JWT, not just signature-checked).
- [x] **Route guard for `/dashboard`.** `src/lib/supabase/middleware.ts` redirects unauthenticated users to `/login` and authenticated users away from `/login` and `/signup`.
- [x] **Password minimum bumped to 8 chars** on `src/app/signup/page.tsx` (was 6).
- [x] **Service-role key confined to server-only files.** Used in `src/app/api/**` and `src/lib/supabase/admin.ts`; never imported by a `'use client'` file. Verified by `grep -r "use client" src/lib/`.

**Documented trade-off (intentionally not changed this pass):**
- `src/lib/supabase/middleware.ts` uses `supabase.auth.getSession()` rather than `getUser()`. The existing inline comment explains this is to avoid Vercel 504 timeouts on database cold starts. The JWT is signed by Supabase and the cookie is HttpOnly+Secure, so this is a deliberate performance/security trade-off. To upgrade to `getUser()` later, add a 1-2s timeout on the user check and graceful fallback to a signed-out state.
- Opt-in flow on Messenger/Telegram is single-step (the speaker sends their email and the bot immediately attaches their PSID/chat_id to matching talks). There is no challenge code. Mitigations already in place: input length cap, email regex validation, no echo-back of the email in failure messages, and the webhook endpoints are now signature-gated so an attacker cannot drive the opt-in. Future improvement: send a one-time code to the email that must be confirmed before the PSID is persisted.

---

## 5. Dependency Security

`npm audit` baseline → post-fix:

| Severity | Before | After |
|---|---|---|
| Critical | 0 | 0 |
| High | 2 (axios via twilio, Next.js CVE-2026-45109) | 0 |
| Moderate | 4 (axios×5 via twilio + ws via supabase) | 2 (transitive postcss via Next) |

- [x] **High-severity Next.js middleware bypass (CVE-2026-45109) fixed.** Bumped `next` and `eslint-config-next` from `16.2.4` → `16.2.9` (patched in 16.2.6+).
- [x] **High-severity axios chain fixed.** Removed unused `twilio` dependency. `twilio` was the only consumer of `axios@1.15.1` (the project itself never imported `axios`). Five CVEs resolved.
- [x] **Moderate `ws` (CVE-2024-37890 etc.) fixed.** Bumped `@supabase/supabase-js` from `^2.104.0` → `^2.108.1`, which transitively bumps `@supabase/realtime-js` to a patched `ws@8.x`.
- [x] **2 remaining moderate in `postcss` (transitive via Next).** Audit suggests downgrading Next to `9.3.3` — a false positive from a build-time tool. No production runtime exposure. Will resolve when Next publishes a patched postcss.

**Pin policy:** all direct dependencies are pinned to exact or `^` ranges; `package-lock.json` is committed. No `latest` in source.

**Review policy for new deps:** before adding, check last commit date, weekly downloads, and known CVEs. Avoid pulling a framework for a single utility.

---

## 6. Data Exposure Prevention

- [x] **Response allowlist on cron and delete-account.** `/api/check-reminders` returns `{ ok, sent, due }` only — no rule IDs, talk IDs, or speaker data. `/api/delete-account` returns `{ ok: true }` only.
- [x] **Webhook response sanitisation.** Both Messenger and Telegram opt-in responses no longer echo the unverified email back to the sender (mitigates limited PII reflection).
- [x] **Selective Supabase select on webhook lookups.** Changed `select('*')` → `select('id, talk_title')` for the opt-in lookup. The webhook no longer pulls passwords (none in this table, but defence-in-depth), PSIDs, chat IDs, or user IDs into memory.
- [x] **No secrets in API responses.** Verified by code review — no route returns an env var or token.

---

## 7. Next.js Specific Hardening

- [x] **`next.config.ts` reviewed.** No `dangerouslyAllowSVG`, no `images.remotePatterns` (no external image domains allowed), no `redirects()` / `rewrites()` (no open-redirect surface).
- [x] **`X-Powered-By` disabled by default** in Next.js 16 — confirmed.
- [x] **Error boundaries present.** New files:
  - `src/app/global-error.tsx` — root-level fallback (HTML shell, no theme dependency).
  - `src/app/error.tsx` — segment-level fallback.
  - `src/app/not-found.tsx` — 404 page.
- [x] **Static asset paths excluded from middleware matcher** (`_next/static`, `_next/image`, image extensions) so headers don't fight Vercel's CDN caching.

---

## 8. Logging & Monitoring

- [x] **Structured logger.** New `src/lib/logger.ts`. Suppresses `debug` in production. JSON to stdout/stderr.
- [x] **PII redaction.** `logger` redacts keys `password`, `token`, `access_token`, `psid`, `sender_psid`, `chat_id`, `telegram_chat_id`, `messenger_psid`, `email`, `speaker_email`, `speaker_name`, `authorization`. Email values are masked (`a***@domain`). String values >200 chars are truncated. Replaces ~30 PII-leaking `console.log` calls in the API routes.
- [x] **No tokens, passwords, or full request bodies logged.** Verified by code review.
- [x] **Sentry stub.** `src/lib/sentry.ts` exports `initSentry({ dsn, sink })` and `getSentry()`. When `SENTRY_DSN` env is unset, calls are no-ops. Wire-up is a follow-up: set `SENTRY_DSN` in Vercel and call `initSentry` once from `instrumentation.ts` (Next 13+ feature).
- [x] **Webhook payload ID logging only.** Per the security rules, only event IDs and route names are logged from webhook bodies; raw bodies are never logged.

---

## Files Changed

| File | Action | Reason |
|---|---|---|
| `src/lib/env.ts` | **new** | Runtime env validation |
| `src/lib/logger.ts` | **new** | Structured logger with PII redaction |
| `src/lib/rate-limit.ts` | **new** | In-memory token-bucket rate limiter |
| `src/lib/api-guard.ts` | **new** | `methodNotAllowed`, `applyRateLimit`, `genericError` |
| `src/lib/security-headers.ts` | **new** | CSP + HSTS + frame-ancestors + permissions policy |
| `src/lib/webhook-security.ts` | **new** | Meta HMAC + Telegram secret-token + email/text helpers |
| `src/lib/sentry.ts` | **new** | No-op Sentry stub |
| `src/middleware.ts` | edit | Wire security headers into every response |
| `src/app/api/check-reminders/route.ts` | edit | CRON_SECRET gate, rate limit, response allowlist, logger, generic errors |
| `src/app/api/keep-alive/route.ts` | edit | CRON_SECRET gate, rate limit, logger, generic errors |
| `src/app/api/delete-account/route.ts` | edit | Strict auth header check, rate limit, logger, method gate |
| `src/app/api/messenger/webhook/route.ts` | edit | X-Hub-Signature-256 HMAC, rate limit, length cap, email regex, select allowlist, logger |
| `src/app/api/telegram/webhook/route.ts` | edit | X-Telegram-Bot-Api-Secret-Token, rate limit, length cap, email regex, select allowlist, logger |
| `src/app/signup/page.tsx` | edit | Password min 6 → 8 |
| `src/app/error.tsx` | **new** | Segment error boundary |
| `src/app/global-error.tsx` | **new** | Root error boundary |
| `src/app/not-found.tsx` | **new** | 404 page |
| `.env.example` | **new** | Required env var names, no values |
| `package.json` | edit | Bump `next`, `eslint-config-next`, `@supabase/supabase-js`; remove `twilio` |
| `SECURITY_CHECKLIST.md` | **new** | This document |

---

## Deferred (future work)

- [ ] Tests — none in repo. Highest priority gap. Add Vitest + Supabase test container; mock all external APIs.
- [ ] MFA / TOTP on Supabase Auth.
- [ ] OAuth (Google, GitHub) — deferred per `from the sratch concept.txt`.
- [ ] Twilio SMS channel — deps removed; integrate when product is ready.
- [ ] iOS build (needs Apple Developer account).
- [ ] i18n / multi-language UI.
- [ ] Move rate limiter to Upstash Redis when traffic grows.
- [ ] Rotate `SUPABASE_SERVICE_ROLE_KEY` out of `vercel.json`.
- [ ] Wire Sentry DSN via `instrumentation.ts`.
- [ ] Add CSRF token to dashboard mutation forms (currently protected only by Supabase's cookie + RLS).
- [ ] Add a one-time-code challenge to the Messenger/Telegram opt-in flow.
