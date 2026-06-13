# Post-Audit Deploy Checklist

> One-time steps on the Vercel / cron-jobs.org / Telegram side to make the security hardening from `SECURITY_CHECKLIST.md` actually take effect. The code is already deployed (or ready to deploy); these are the manual knobs.

**Generated:** 2026-06-13
**Related:** `SECURITY_CHECKLIST.md` (full audit + code-side measures)

---

## 1. Vercel project env vars

Add the two new secrets (Project → Settings → Environment Variables → add for **Production** + **Preview**):

- [ ] `CRON_SECRET` = `1phifsUeb5fandkWL9EL1ixmfxYvubYaJrBBShwU8b19xG3z_T5XEYGK9Enf_qsb`
- [ ] `TELEGRAM_WEBHOOK_SECRET` = `MKsNvR_METO4wnt5WoURJ8x0Zk1tHH1Yuv7K-c4vQSM`

> **Don't** commit these values to git or paste them into chat. Treat them like passwords. If either leaks, rotate by re-running the secret generation snippet below and updating the env var + this file.

### Rotate a secret (if leaked)

```bash
node -e "console.log('CRON_SECRET=' + require('crypto').randomBytes(48).toString('base64url')); console.log('TELEGRAM_WEBHOOK_SECRET=' + require('crypto').randomBytes(32).toString('base64url'));"
```

---

## 2. cron-jobs.org (or any external cron pinger)

- [x] `/api/check-reminders` job URL → `https://talk-reminder.vercel.app/api/check-reminders?secret=1phifsUeb5fandkWL9EL1ixmfxYvubYaJrBBShwU8b19xG3z_T5XEYGK9Enf_qsb`  *(done)*
- [ ] If you have a separate keep-alive job, append the same `?secret=...` to that URL too.

**Verify it works:** open the job → "Run now" / "Trigger" → check Vercel logs for a `200` response, not `401`.

---

## 3. Telegram webhook re-registration

Required because we added `X-Telegram-Bot-Api-Secret-Token` verification; the old registration has no secret set.

- [x] Get your bot token from Vercel env (`TELEGRAM_BOT_TOKEN`).  *(done - read from `.env.local`)*
- [x] Run the registration script.  *(done - `node register-telegram-webhook.cjs`)*

The script reads `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` from `.env.local` and calls `setWebhook` + `getWebhookInfo`. Last result:

```
setWebhook -> { "ok": true, "result": true, "description": "Webhook was set" }
getWebhookInfo -> { "ok": true, "result": { "url": "https://talk-reminder.vercel.app/api/telegram/webhook", ..., "allowed_updates": ["message"] } }
```

Telegram hides `secret_token` from `getWebhookInfo` responses by design; the fact that the registration accepted it is the confirmation. Telegram will send `X-Telegram-Bot-Api-Secret-Token` on every webhook call from now on.

**Verify end-to-end:** send your bot a message containing the email of a scheduled talk. Expected reply: `Successfully opted in for reminders for: <talk title>!`

---

## 4. Verify security headers are live

After deploy, run from a terminal:

```bash
curl -sI https://talk-reminder.vercel.app/dashboard | grep -iE 'content-security|strict-transport|x-frame|x-content|referrer|permissions|cross-origin'
```

You should see all of these headers. If `Content-Security-Policy` is missing, the middleware isn't wired correctly — flag it.

---

## 5. CRITICAL — rotate `SUPABASE_SERVICE_ROLE_KEY` out of `vercel.json`

- [x] Generate a new service-role / secret API key in Supabase.  *(done — old JWT rotated/revoked)*
- [x] Update Vercel env `SUPABASE_SERVICE_ROLE_KEY` with the new key.  *(done)*
- [x] Remove the key from `vercel.json` and replace with env-var reference, OR delete the line.  *(done — line deleted entirely; the value lives only in Vercel env now)*
- [ ] Bounce the deployment (redeploy) so the new env is in use at runtime.
- [x] Confirm the old key is invalidated in Supabase.  *(done — JWT rotated)*
- [ ] `git grep -n SERVICE_ROLE_KEY` should return only server-only source files (admin.ts, api routes) and `.env.example`, **not** `vercel.json`.

**Git-history note:** the old JWT still exists in past git commits. If you want a fully clean history, run a BFG/filter-repo scrub. The old key is already revoked at the Supabase level, so the live risk is zero — the history scrub is hygiene, not urgent.

**`vercel.json` after the edit (for verification):**
```json
{
  "build": {
    "env": {
      "NEXT_PUBLIC_SUPABASE_URL": "https://vfvhpuiklqayxznxmhgo.supabase.co",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY": "eyJ...<public anon JWT>..."
    }
  },
  "alias": "talk-reminder.vercel.app"
}
```

---

## 6. (Optional) Wire Sentry

- [ ] Set `SENTRY_DSN` in Vercel env.
- [ ] Create `src/instrumentation.ts` that calls `initSentry({ dsn: process.env.SENTRY_DSN, sink: logger })`.
- [ ] Add `export { initSentry } from './instrumentation'` to register-error hooks as needed.

Until then, the no-op stub in `src/lib/sentry.ts` is harmless.

---

## 7. (Optional) Verify cron end-to-end

Quick smoke test that a real reminder fires:

1. In the dashboard, create a talk with `talk_date` ~10 minutes from now and an offset of `10 minutes`.
2. Wait 10 minutes (or trigger the cron manually via cron-jobs.org "Run now").
3. Check the speaker's email / Messenger / Telegram.

If the speaker received the reminder → you're fully shipped. If not, Vercel logs will show the channel that failed and why.

---

## Sign-off

When everything above is checked:

- [ ] All section 1–3 boxes ticked
- [ ] Section 4 curl returns all expected headers
- [ ] Section 5 either completed or explicitly deferred (record reason in `PROJECT_RULES.md` session log)
- [ ] One real reminder has fired end-to-end (section 7)

**Progress as of 2026-06-13:**

- [x] Section 2 — cron-jobs.org updated, 200 response confirmed in Vercel logs
- [x] Section 3 — Telegram webhook re-registered via `register-telegram-webhook.cjs`
- [ ] Section 1 — Vercel env vars need to be added manually (Production + Preview)
- [ ] Section 4 — header verification (after deploy)
- [ ] Section 5 — service-role key rotation (still outstanding, CRITICAL)
