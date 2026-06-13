# Resend Setup (Talk Reminder)

This project sends reminder emails via [Resend](https://resend.com) using the `ortuma.site` domain.

## 1. Resend Dashboard

1. Sign in at https://resend.com
2. **Domains** → **Add Domain** → enter `ortuma.site` → follow the DNS instructions (add the SPF, DKIM, and DMARC records at your DNS provider)
3. Wait for verification (usually minutes, can take up to 24h)
4. **API Keys** → **Create API Key** → name it e.g. `Talk Reminder Production` → copy the key (starts with `re_`)

## 2. Environment Variables

| Where | Var | Value |
|---|---|---|
| Vercel dashboard → Settings → Environment Variables (Production + Preview) | `RESEND_API_KEY` | `re_xxxxxxxxxxxx` |
| Local `.env.local` (only for `npm run dev`) | `RESEND_API_KEY` | `re_xxxxxxxxxxxx` |

- `.env.local` is gitignored — never commit it
- Do **not** put the key in `vercel.json` (the Vercel dashboard is the only place prod secrets live)
- The key is read at runtime by `src/app/api/check-reminders/route.ts`

## 3. Sender Identity

All emails are sent as:

```
Talk Reminder <reminder-noreply@ortuma.site>
```

The `reminder-noreply@ortuma.site` mailbox does not need to actually receive mail — it's just the `From:` header. Resend handles delivery.

## 4. Test It

1. In the deployed app, add a talk with a **near-future** date and a **real speaker email** you control
2. Click **Run Check** on the dashboard (or wait for the Vercel cron)
3. Check the speaker inbox — email should arrive from `Talk Reminder <reminder-noreply@ortuma.site>`
4. Verify in Vercel: **Deployments → click latest → Functions → `/api/check-reminders` → Logs**
   - Success: `Email sent to: <email>`
   - Missing key: `No RESEND_API_KEY - emails will be logged only`
   - Failure: `Email error: <resend error message>`

## 5. Free Tier Limits

Resend free tier: 3,000 emails/month, 100/day. Sufficient for a small event organizer.
