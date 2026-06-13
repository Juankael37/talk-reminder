# Debugging Session Log: Talk Reminder App Bugs

This document logs the bugs fixed during the session on June 13, 2026.

---

## 1. Dashboard "Run Check" - 401 Unauthorized Error

### Problem
* When clicking the **"Run Reminder Check"** button in the dashboard, the browser sent a `POST` request to `/api/check-reminders`.
* The server endpoint verified request authorization via the `CRON_SECRET` env var.
* Since the browser client does not (and should not) have access to server-side secrets, the request was rejected with a `401 Unauthorized` response.

### Solution
* Updated the `isAuthorized` logic in `src/app/api/check-reminders/route.ts` to support dual-authentication:
  1. Validates Vercel Cron requests using the `CRON_SECRET` signature.
  2. Validates client-side requests using the user's Supabase JSON Web Token (JWT).
* Updated `runCheck` in `src/app/dashboard/page.tsx` to retrieve the current Supabase session token and pass it as a `Bearer` token inside the `Authorization` header.

---

## 2. Serverless Environment Variables (Vercel Cold Starts / Initialization)

### Problem
* End-user opt-ins for both Facebook Messenger and Telegram were failing.
* The API routes for webhooks (`/api/messenger/webhook` and `/api/telegram/webhook`) read their configuration secrets (e.g. `APP_SECRET`, `TELEGRAM_BOT_TOKEN`) at the module level.
* In serverless host environments (like Vercel), module-level queries are evaluated when the container loads. This sometimes occurs before runtime environment variables are populated, resulting in `undefined` values that break webhooks and message dispatches.

### Solution
* Converted all module-level environment variable lookups to dynamic runtime getter functions (e.g. `getVerifyToken`, `getPageAccessToken`, `getAppSecret`, `getTelegramBotToken`, `getWebhookSecret`).
* Environment variables are now read dynamically on every request invocation.

---

## 3. Server-side Environment Vars in Next.js

### Problem
* After pushing the initial fixes, `POST` requests to `/api/check-reminders` failed with:
  `[env] Missing required env var: NEXT_PUBLIC_SUPABASE_URL`
* The variables were declared in `vercel.json` under `"build": { "env": { ... } }`, which makes them available *only* during compile/build time. In Next.js, `NEXT_PUBLIC_` prefixes only auto-inline into code bundled for the browser; Node.js serverless functions do not automatically get them at runtime.

### Solution
* Added the runtime `"env"` block to `vercel.json` mapped to the Supabase variables:
  ```json
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "...",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "..."
  }
  ```

---

## 4. Messenger Reminder Dispatches (OAuthException 100)

### Problem
* The Messenger opt-in worked, but when sending reminders, Meta's Graph API rejected the request with:
  `"message": "Invalid parameter", "type": "OAuthException", "code": 100, "error_subcode": 1893061`
  `Deprecated Message Tag Not Allowed: You are trying to send a message with a message tag but this feature is not allowed. To send a utility message, use an approved utility template.`
* The codebase used the deprecated `CONFIRMED_EVENT_UPDATE` tag which was retired by Meta.

### Solution
* Switched the request body's `messaging_type` parameter from `MESSAGE_TAG` to `RESPONSE` and removed the deprecated `tag` key to align with standard messaging guidelines.

---

## 5. Webhook Secrets Configuration

### Problem
* The Telegram webhook initially threw `telegram.webhook_secret_missing`.
* The variable `TELEGRAM_WEBHOOK_SECRET` was not configured in Vercel's Environment Variables, causing the security validation header check to reject incoming Telegram updates.

### Solution
* Ensured the user added `TELEGRAM_WEBHOOK_SECRET` and `CRON_SECRET` to their Vercel Project Settings.
* Added fallback/detailed log property extraction (`errorMessage`) to the webhook receiver to avoid logging redactions or truncation.
