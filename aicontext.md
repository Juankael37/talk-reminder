# AI Context: Talk Reminder

> Context file to help AI assistants quickly understand this repository.

## 1. Project Identity

- **Name:** Talk Reminder (by Ortuma)
- **Tagline:** Automated multi-channel speaker reminder system for event organizers.
- **Type:** Web app + native Android (APK) via Capacitor wrapper.
- **Live Web:** https://talk-reminder.vercel.app
- **GitHub:** https://github.com/Juankael37/talk-reminder
- **APK:** `Talk-Reminder.apk` (in repo root)

## 2. Purpose

Lets event organizers schedule automated reminders for speakers via **Email**, **Facebook Messenger**, or **Telegram**. Organizers add talks (speaker, title, date/time), pick a channel, and define one or more reminder offsets (e.g. 1 week, 1 day, custom). A scheduled job dispatches reminders at the right time. For Messenger/Telegram, the speaker must opt-in by messaging the bot with their email.

Every send attempt is recorded in `reminder_logs` with status (`success`/`failed`/`skipped`), error message, channel, and recipient. If a dispatch fails — provider error, missing opt-in, no email — the organizer is automatically emailed with the failure reason so they can manually contact the speaker. Organizers review all attempts in `/logs`.

## 3. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js `16.2.4` (App Router) + React `19.2.4` |
| Language | TypeScript (`strict: true`) |
| Styling | Tailwind CSS `v4` (via `@tailwindcss/postcss`), CSS variables for theming |
| Auth + DB | Supabase (`@supabase/ssr` + `@supabase/supabase-js`) — Auth + PostgreSQL |
| Email | `resend` (HTTP API, ortuma.site domain) |
| Messenger | Meta Messenger Platform API (Graph API v19.0) |
| Telegram | Telegram Bot API (`sendMessage`) |
| Mobile | Capacitor `8.3.1` (Android) |
| Hosting | Vercel (with `vercel.json` for build envs + alias) |
| Scheduling | External cron (cronjob.org) hits `/api/check-reminders` every 15 min |
| Fonts | `Inter` via `next/font/google` |
| Node | `>=20.0.0` |

## 4. Directory Layout

```
talk-reminder/
├── android/                       # Capacitor-generated Android project (ignored by Vercel)
├── public/                        # Static assets (logos, icons)
├── supabase/
│   └── migrations/
│       ├── 004_add_telegram_columns.sql
│       └── 005_reminder_logs.sql  # reminder_logs schema + RLS for logs view
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── layout.tsx             # Root layout: Inter font, ThemeProvider
│   │   ├── page.tsx               # Root redirect: session -> /dashboard, else /login
│   │   ├── globals.css            # Tailwind v4 + theme CSS vars
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── dashboard/page.tsx     # Talks list, add modal, Settings modal, ConfirmModal/Toast, mobile cards
│   │   ├── logs/page.tsx          # Reminder Logs (table/cards + filter + pagination)
│   │   ├── privacy/page.tsx
│   │   ├── terms/page.tsx
│   │   ├── data-deletion/page.tsx
│   │   └── api/
│   │       ├── check-reminders/route.ts        # POST/GET — cron + manual dispatch; status logging + organizer failure email
│   │       ├── keep-alive/route.ts             # GET — Supabase keep-alive ping
│   │       ├── delete-account/route.ts         # POST — admin delete user
│   │       ├── messenger/webhook/route.ts      # GET (verify) + POST (events)
│   │       └── telegram/webhook/route.ts       # POST (events)
│   ├── components/
│   │   ├── ThemeProvider.tsx      # 'use client' — light/dark context, localStorage
│   │   └── TextLogo.tsx           # "Talk Reminder" wordmark (orange + dark)
│   ├── lib/
│   │   ├── datetime.ts            # parseInTz/offsetDate/resolveTz — TZ-aware form parsing
│   │   └── supabase/
│   │       ├── client.ts          # createBrowserClient (for 'use client' components)
│   │       ├── server.ts          # createServerClient (for RSC/actions)
│   │       ├── admin.ts           # createAdminClient using SERVICE_ROLE_KEY
│   │       └── middleware.ts      # session refresh + route guards
│   └── middleware.ts              # calls updateSession on every request
├── generate-icons.js              # sharp script: regenerates Android mipmap icons
├── generate-splash.js             # sharp script: regenerates Android splash screens
├── capacitor.config.ts            # appId com.talkreminder.app, webDir .next
├── vercel.json                    # build envs + alias talk-reminder.vercel.app
├── next.config.ts                 # default Next config
├── postcss.config.mjs             # @tailwindcss/postcss plugin
├── eslint.config.mjs              # extends next/core-web-vitals + next/typescript
├── tsconfig.json                  # strict, paths "@/*" -> "./src/*"
├── package.json                   # name: talk-reminder-temp
├── PROJECT.md / PROJECT_PLAN.md / PROJECT_RULES.md  # planning docs
├── portfolio.md                   # frontmatter-style project portfolio entry
├── META_SETUP.md                  # Meta Messenger setup walkthrough
├── RESEND_SETUP.md                # Resend email setup
├── Talk-Reminder.apk              # release APK
└── .vercelignore / .gitignore / .gitattributes
```

## 5. Database Schema (Supabase / Postgres)

```sql
talks (
  id uuid pk default gen_random_uuid(),
  user_id uuid references auth.users not null,
  speaker_name text not null,
  talk_title text,
  talk_date timestamptz not null,            -- always stored as UTC; interpreted as NEXT_PUBLIC_TIMEZONE on input
  notification_channel text default 'email', -- 'email' | 'messenger' | 'telegram'
  speaker_email text,
  messenger_psid text,
  messenger_opted_in boolean default false,
  telegram_chat_id text,
  telegram_opted_in boolean default false,
  created_at timestamptz default now()
)

reminder_rules (
  id uuid pk default gen_random_uuid(),
  talk_id uuid references talks on delete cascade,
  offset_label text not null,        -- e.g. "1 week", "1 day", "2 hours"
  offset_interval text not null,     -- e.g. "7 days", "2 hours"
  scheduled_time timestamptz not null,
  is_sent boolean default false,
  unique (talk_id, offset_label)
)

reminder_logs (
  id uuid pk default gen_random_uuid(),
  rule_id uuid references reminder_rules on delete cascade,
  sent_at timestamptz default now(),
  created_at timestamptz default now(),         -- backfilled from sent_at for legacy rows
  response text,
  status text not null                          -- 'success' | 'failed' | 'skipped'
    check (status in ('success', 'failed', 'skipped')),
  error_message text,                           -- human-readable failure reason
  channel text,                                 -- 'email' | 'messenger' | 'telegram' | null
  recipient text,                               -- speaker email / 'messenger:hidden' / 'telegram:hidden'
  kind text,                                    -- 'email_dispatch' | 'messenger_dispatch' | 'telegram_dispatch' | 'optin_missing' | 'no_recipient' | ...
  organizer_notified_at timestamptz             -- set when organizer receives a failure email
)
```

RLS is enabled on all tables. Policies:
- `talks` and `reminder_rules` — users can only see their own rows (via `user_id = auth.uid()`).
- `reminder_logs` — users can SELECT rows whose `rule_id` belongs to one of their `talks` (via `EXISTS` join). Service role bypasses RLS for inserts from the dispatcher.

Indexes on `reminder_logs`: `rule_id`, `created_at DESC`, partial index on `status = 'failed'`.

## 6. Environment Variables

| Var | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Browser/server anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | Bypasses RLS — used in API routes/webhooks |
| `RESEND_API_KEY` | server-only | Resend API key for transactional email (sender: `reminder-noreply@ortuma.site`) AND for organizer failure alerts |
| `MESSENGER_PAGE_ACCESS_TOKEN` | server-only | Meta Graph API send token |
| `MESSENGER_APP_SECRET` | server-only | (documented in META_SETUP.md) |
| `MESSENGER_VERIFY_TOKEN` | server-only | Custom string for webhook verification |
| `TELEGRAM_BOT_TOKEN` | server-only | Telegram bot token |
| `NEXT_PUBLIC_TIMEZONE` | public | IANA tz — used by date/time inputs and email templates (default `Asia/Manila`) |
| `CRON_SECRET` | server-only | Bearer token expected by `/api/check-reminders` for cronjob.org auth |

> These are currently inlined in `vercel.json` (build env) for the deployed env. For local dev create `.env.local` (gitignored).

## 7. API Routes

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/check-reminders` | `GET`, `POST` | Auth via `Bearer CRON_SECRET` or user JWT. Finds `reminder_rules` where `is_sent=false` and `scheduled_time <= now`, dispatches via the talk's `notification_channel`, marks rule sent on success, writes a `reminder_logs` row with `status`/`error_message`/`channel`/`recipient`/`kind`. On failure (provider error, missing opt-in, missing email) emails the organizer via Resend with the failure reason. Per-rule dedupe of organizer emails per cron run. |
| `/api/keep-alive` | `GET` | Lightweight `select count` against `talks` to keep Supabase from pausing on free tier. |
| `/api/delete-account` | `POST` | Requires `Authorization: Bearer <jwt>`; uses service role to call `auth.admin.deleteUser`. |
| `/api/messenger/webhook` | `GET` (hub verification) + `POST` (events) | Verifies token on GET; on POST, reads `sender.id` + text, looks up talks by `ilike(speaker_email, text)`, stores `messenger_psid` and sets `messenger_opted_in=true`. |
| `/api/telegram/webhook` | `POST` | Same opt-in flow using Telegram `chat.id` -> `telegram_chat_id`, `telegram_opted_in=true`. |

All API routes export `export const dynamic = 'force-dynamic'` and create a fresh `@supabase/supabase-js` client with the service role key (or use `@/lib/supabase/admin`).

## 8. UI / UX Conventions

- **Theme:** light/dark via `ThemeProvider` (context + `localStorage` + `prefers-color-scheme`). `dark` class is toggled on `<html>`. Tailwind v4 with `@custom-variant dark (&:where(.dark, .dark *))`.
- **Color tokens (CSS vars in `globals.css`):** primary `#6366F1` (indigo-500), primary-dark `#4F46E5`, success `#10B981`, warning `#F59E0B`, error `#EF4444`, dark background `#0F172A`, dark surface `#1E293B`. Backgrounds in pages also use orange-50 gradients in light mode.
- **Components:** plain function components, no UI library. Forms use `rounded-2xl` + `border`. Buttons are gradient `from-orange-500 to-orange-600`. Icons are inline SVG.
- **Modals:** reusable `ConfirmModal` and `Toast` (success / error / info) defined inline in the page that uses them. Escape closes, backdrop click cancels. Always show a confirm step before destructive actions (delete talk, delete account).
- **Mobile:** talks table collapses to a card layout below `md`. Cards have a kebab delete button always reachable. Sidebar is a full-screen overlay on mobile.
- **Settings:** gear icon in the dashboard header opens a Settings modal with Profile (email), Dark Mode toggle, Logout, and Delete Account (with confirm).
- **Routing guards:** enforced in `src/lib/supabase/middleware.ts` (redirect unauthenticated users away from `/dashboard` and `/logs`, authed users away from `/login` and `/signup`).
- **Force dynamic:** all `'use client'` auth pages export `export const dynamic = 'force-dynamic'`.

## 9. Code Patterns to Follow

- **Supabase clients:**
  - `'use client'` components -> `import { createClient } from '@/lib/supabase/client'`
  - RSC / server actions -> `import { createClient } from '@/lib/supabase/server'`
  - API routes / webhooks -> `import { createClient } from '@supabase/supabase-js'` with service role key (or use `@/lib/supabase/admin`).
- **Auth check in pages:** `const { data: { user } } = await supabase.auth.getUser()`; redirect to `/login` if missing.
- **Form state:** plain `useState` per field; submit handler does `e.preventDefault()`, sets `loading`, calls Supabase, on success calls a parent `onSuccess` callback.
- **Reminders creation:** for each enabled offset, compute `scheduled_time = talk_date - offset`, then `insert` into `reminder_rules`. Use `parseInTz` from `@/lib/datetime` for the offset math so the input date+time is interpreted in `NEXT_PUBLIC_TIMEZONE` (not the browser's local TZ).
- **Timestamps:** always store ISO (`toISOString()`). For form input → UTC conversion use `parseInTz(dateStr, timeStr, NEXT_PUBLIC_TIMEZONE)`. Render with `toLocaleDateString` / `toLocaleTimeString` passing `timeZone: NEXT_PUBLIC_TIMEZONE` (use `resolveTz()` from `@/lib/datetime` for the default).
- **Env access in server code:** read `process.env.X` inside the function (don't cache at module level except via lazy getters).
- **Modal/Toast:** reuse the inline `ConfirmModal` (props: title, body, confirmLabel, danger, onCancel, onConfirm) and `Toast` (props: message, variant, onClose). Toasts auto-dismiss after 4s.
- **Dispatcher logging:** every send attempt in `/api/check-reminders` must insert a `reminder_logs` row with `status`, `error_message`, `channel`, `recipient`, `kind`. Failures additionally trigger `recordFailureAndNotify` which emails the organizer via Resend.
- **No comments in code** — match existing style (see `CRITICAL` rule below).

## 10. Critical Rules / Guardrails

- **Do NOT add code comments.** The codebase has no inline comments; follow that style.
- **Do NOT introduce a UI library** (no shadcn, MUI, etc.) — current UI is hand-rolled with Tailwind.
- **Do NOT change `notification_channel` value semantics** — values are exactly `'email'`, `'messenger'`, `'telegram'`.
- **Do NOT change `reminder_logs.status` value semantics** — values are exactly `'success'`, `'failed'`, `'skipped'`.
- **Service role key is server-only** — never reference `SUPABASE_SERVICE_ROLE_KEY` from a `'use client'` file.
- **Webhooks must be public POST endpoints** with `export const dynamic = 'force-dynamic'`. Don't add auth to them.
- **Cron entrypoint is `/api/check-reminders`** — both `GET` and `POST` work; `GET` just delegates to `POST`. Auth via `Bearer ${CRON_SECRET}` header OR `?secret=${CRON_SECRET}` query param, OR a valid user JWT.
- **Mobile wrapper assumes `webDir: '.next'`** — the Android app loads the deployed Vercel URL via `capacitor.config.ts` (`server.url`), not the local build.
- **APK and `node_modules` / `android/` are gitignored from Vercel** via `.vercelignore`.
- **`supabase/migrations/` is append-only** — never edit an existing migration; always add a new numbered file.

## 11. Common Tasks & Where to Edit

| Task | File(s) |
|---|---|
| Add a new notification channel | `src/app/api/check-reminders/route.ts` (dispatch), `src/app/dashboard/page.tsx` (radio UI), then add migration + new columns in `talks`. Also add a new `kind` value in `reminder_logs` writes. |
| Change reminder timing logic | `src/lib/datetime.ts` (TZ helpers) + `src/app/dashboard/page.tsx` (AddTalkModal offsets). |
| Change theme colors | `src/app/globals.css` (`:root` + `.dark` blocks). |
| Add a new page | `src/app/<route>/page.tsx`; remember the middleware guard for `/dashboard`-/`/logs`-like routes. |
| Add an API route | `src/app/api/<name>/route.ts`, export `dynamic = 'force-dynamic'`. |
| Update Supabase schema | Add a new file in `supabase/migrations/<next-number>_<description>.sql`. Never edit an existing migration. Append-only. |
| Change organizer failure email content | `src/app/api/check-reminders/route.ts` — `notifyOrganizerOfFailure()`. |
| Change success/failure UI on dashboard | `src/app/dashboard/page.tsx` — `Toast` and `ConfirmModal` are defined in-file. |

## 12. Build & Run

```bash
npm install            # node >= 20
npm run dev            # next dev (http://localhost:3000)
npm run build          # next build
npm run start          # next start (production server)
npm run lint           # eslint
```

Android build (from Capacitor docs):
```bash
npx cap sync android
npx cap open android   # then build APK from Android Studio
```

Applying a migration (Supabase CLI):
```bash
# Either run via CLI:
supabase db push

# Or paste the SQL file into Supabase Dashboard -> SQL Editor -> Run.
```

## 13. Known Quirks

- `package.json` `name` is still `talk-reminder-temp` (legacy from bootstrapping).
- `useTheme` throws if used outside `ThemeProvider` — every page using the hook must be wrapped by the root layout (which it is).
- Middleware uses `supabase.auth.getSession()` (not `getUser`) intentionally to avoid Vercel 504s on cold starts.
- `talks.speaker_email` is required even for Messenger/Telegram — used as the opt-in lookup key.
- Cron scheduling is handled by cronjob.org (external) hitting `/api/check-reminders` every 15 min with the `CRON_SECRET`. `vercel.json` has no `crons` block on purpose.
- Dashboard talk delete uses optimistic state update (removes from list immediately, reverts on error). No `window.location.reload()`.
- Form date/time inputs are interpreted as `NEXT_PUBLIC_TIMEZONE` (Asia/Manila by default), not the browser's local TZ. Always use `parseInTz` from `@/lib/datetime` — never `new Date(\`${date}T${time}\`)` which silently uses browser TZ.
- `reminder_logs` rows from before migration 005 were backfilled with `status='success'` and `kind='legacy'` so legacy data still renders cleanly in `/logs`.
- Organizer failure emails are deduplicated per `(rule_id)` per cron run via an in-memory `Set`, so a rule that fails repeatedly won't flood the organizer's inbox during a single 15-minute window.