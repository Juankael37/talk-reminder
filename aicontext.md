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
| Scheduling | Vercel Cron hits `/api/check-reminders` |
| Fonts | `Inter` via `next/font/google` |
| Node | `>=20.0.0` |

## 4. Directory Layout

```
talk-reminder/
├── android/                       # Capacitor-generated Android project (ignored by Vercel)
├── public/                        # Static assets (logos, icons)
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── layout.tsx             # Root layout: Inter font, ThemeProvider
│   │   ├── page.tsx               # Root redirect: session -> /dashboard, else /login
│   │   ├── globals.css            # Tailwind v4 + theme CSS vars
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── dashboard/page.tsx     # Client component: talks list, add modal, sidebar
│   │   ├── privacy/page.tsx
│   │   ├── terms/page.tsx
│   │   ├── data-deletion/page.tsx
│   │   └── api/
│   │       ├── check-reminders/route.ts        # POST/GET — cron + manual dispatch
│   │       ├── keep-alive/route.ts             # GET — Supabase keep-alive ping
│   │       ├── delete-account/route.ts         # POST — admin delete user
│   │       ├── messenger/webhook/route.ts      # GET (verify) + POST (events)
│   │       └── telegram/webhook/route.ts       # POST (events)
│   ├── components/
│   │   ├── ThemeProvider.tsx      # 'use client' — light/dark context, localStorage
│   │   └── TextLogo.tsx           # "Talk Reminder" wordmark (orange + dark)
│   ├── lib/supabase/
│   │   ├── client.ts              # createBrowserClient (for 'use client' components)
│   │   ├── server.ts              # createServerClient (for RSC/actions)
│   │   ├── admin.ts               # createAdminClient using SERVICE_ROLE_KEY
│   │   └── middleware.ts          # session refresh + route guards
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
  talk_date timestamptz not null,
  notification_channel text default 'email',  -- 'email' | 'messenger' | 'telegram'
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
  response text
)
```

RLS is enabled; users can only see their own `talks`/`reminder_rules`.

## 6. Environment Variables

| Var | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Browser/server anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | Bypasses RLS — used in API routes/webhooks |
| `RESEND_API_KEY` | server-only | Resend API key for transactional email (sender: `reminder-noreply@ortuma.site`) |
| `MESSENGER_PAGE_ACCESS_TOKEN` | server-only | Meta Graph API send token |
| `MESSENGER_APP_SECRET` | server-only | (documented in META_SETUP.md) |
| `MESSENGER_VERIFY_TOKEN` | server-only | Custom string for webhook verification |
| `TELEGRAM_BOT_TOKEN` | server-only | Telegram bot token |
| `NEXT_PUBLIC_TIMEZONE` | public | IANA tz for date formatting (default `Asia/Manila`) |

> These are currently inlined in `vercel.json` (build env) for the deployed env. For local dev create `.env.local` (gitignored).

## 7. API Routes

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/check-reminders` | `GET`, `POST` | Finds `reminder_rules` where `is_sent=false` and `scheduled_time <= now`, dispatches via the talk's `notification_channel`, marks rule sent, writes a `reminder_logs` row. |
| `/api/keep-alive` | `GET` | Lightweight `select count` against `talks` to keep Supabase from pausing on free tier. |
| `/api/delete-account` | `POST` | Requires `Authorization: Bearer <jwt>`; uses service role to call `auth.admin.deleteUser`. |
| `/api/messenger/webhook` | `GET` (hub verification) + `POST` (events) | Verifies token on GET; on POST, reads `sender.id` + text, looks up talks by `ilike(speaker_email, text)`, stores `messenger_psid` and sets `messenger_opted_in=true`. |
| `/api/telegram/webhook` | `POST` | Same opt-in flow using Telegram `chat.id` -> `telegram_chat_id`, `telegram_opted_in=true`. |

All API routes export `export const dynamic = 'force-dynamic'` and create a fresh `@supabase/supabase-js` client with the service role key.

## 8. UI / UX Conventions

- **Theme:** light/dark via `ThemeProvider` (context + `localStorage` + `prefers-color-scheme`). `dark` class is toggled on `<html>`. Tailwind v4 with `@custom-variant dark (&:where(.dark, .dark *))`.
- **Color tokens (CSS vars in `globals.css`):** primary `#6366F1` (indigo-500), primary-dark `#4F46E5`, success `#10B981`, warning `#F59E0B`, error `#EF4444`, dark background `#0F172A`, dark surface `#1E293B`. Backgrounds in pages also use orange-50 gradients in light mode.
- **Components:** plain function components, no UI library. Forms use `rounded-2xl` + `border`. Buttons are gradient `from-orange-500 to-orange-600`. Icons are inline SVG.
- **Modals:** rendered conditionally in the same file as the page (see `AddTalkModal` inside `dashboard/page.tsx`).
- **Routing guards:** enforced in `src/lib/supabase/middleware.ts` (redirect unauthenticated users away from `/dashboard`, authed users away from `/login` and `/signup`).
- **Force dynamic:** all `'use client'` auth pages export `export const dynamic = 'force-dynamic'`.

## 9. Code Patterns to Follow

- **Supabase clients:**
  - `'use client'` components -> `import { createClient } from '@/lib/supabase/client'`
  - RSC / server actions -> `import { createClient } from '@/lib/supabase/server'`
  - API routes / webhooks -> `import { createClient } from '@supabase/supabase-js'` with service role key (or use `@/lib/supabase/admin`).
- **Auth check in pages:** `const { data: { user } } = await supabase.auth.getUser()`; redirect to `/login` if missing.
- **Form state:** plain `useState` per field; submit handler does `e.preventDefault()`, sets `loading`, calls Supabase, on success calls a parent `onSuccess` callback.
- **Reminders creation:** for each enabled offset, compute `scheduled_time = talk_date - offset`, then `insert` into `reminder_rules`.
- **Timestamps:** always store ISO (`toISOString()`); render with `toLocaleDateString` / `toLocaleTimeString` using `NEXT_PUBLIC_TIMEZONE` in API routes.
- **Env access in server code:** read `process.env.X` inside the function (don't cache at module level except via lazy getters).
- **No comments in code** — match existing style (see `CRITICAL` rule below).

## 10. Critical Rules / Guardrails

- **Do NOT add code comments.** The codebase has no inline comments; follow that style.
- **Do NOT introduce a UI library** (no shadcn, MUI, etc.) — current UI is hand-rolled with Tailwind.
- **Do NOT change `notification_channel` value semantics** — values are exactly `'email'`, `'messenger'`, `'telegram'`.
- **Service role key is server-only** — never reference `SUPABASE_SERVICE_ROLE_KEY` from a `'use client'` file.
- **Webhooks must be public POST endpoints** with `export const dynamic = 'force-dynamic'`. Don't add auth to them.
- **Cron entrypoint is `/api/check-reminders`** — both `GET` and `POST` work; `GET` just delegates to `POST`.
- **Mobile wrapper assumes `webDir: '.next'`** — the Android app loads the deployed Vercel URL via `capacitor.config.ts` (`server.url`), not the local build.
- **APK and `node_modules` / `android/` are gitignored from Vercel** via `.vercelignore`.

## 11. Common Tasks & Where to Edit

| Task | File(s) |
|---|---|
| Add a new notification channel | `src/app/api/check-reminders/route.ts` (dispatch), `src/app/dashboard/page.tsx` (radio UI), `src/lib/supabase/*` not needed unless adding fields, then add migration + new columns in `talks`. |
| Change theme colors | `src/app/globals.css` (`:root` + `.dark` blocks). |
| Add a new page | `src/app/<route>/page.tsx`; remember the middleware guard for `/dashboard`-like routes. |
| Add an API route | `src/app/api/<name>/route.ts`, export `dynamic = 'force-dynamic'`. |
| Update Supabase types | Add a migration file in `supabase/` (currently empty — create `supabase/migrations/...sql`). |
| Regenerate mobile icons | Run `node generate-icons.js` / `node generate-splash.js` (requires `public/mobile_logo.png`). |
| Re-deploy | `vercel --prod` (or push to `main`); envs are baked into `vercel.json`. |

## 12. Build & Run

```bash
npm install            # node >= 20
npm run dev            # next dev (http://localhost:3000)
npm run build          # next build
npm run start          # next start
npm run lint           # eslint
```

Android build (from Capacitor docs):
```bash
npx cap sync android
npx cap open android   # then build APK from Android Studio
```

## 13. Known Quirks

- `package.json` `name` is still `talk-reminder-temp` (legacy from bootstrapping).
- Dashboard's `deleteTalk` uses `window.location.reload()` instead of refetching state.
- `useTheme` throws if used outside `ThemeProvider` — every page using the hook must be wrapped by the root layout (which it is).
- Middleware uses `supabase.auth.getSession()` (not `getUser`) intentionally to avoid Vercel 504s on cold starts.
- `talks.speaker_email` is required even for Messenger/Telegram — used as the opt-in lookup key.
- Cron schedule is configured in Vercel dashboard (not committed in this repo beyond `vercel.json`).
