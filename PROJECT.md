# Talk Reminder App – Complete Project Specification

**Project Goal**: A multi-user mobile app (Android) that lets people schedule automated reminders for speakers. Reminders via Email (nodemailer/Gmail) and Facebook Messenger (Meta Messenger Platform API).
**Stack**: Next.js 14 (App Router) + Supabase (Auth + DB) + nodemailer + Meta Messenger API + Capacitor (native wrapper) + Vercel (hosting + cron).

---

## Core Features (Completed)
1. User sign-up / login (email + password) using Supabase Auth.
2. After login, user can:
   - Add a talk: speaker name, talk title (optional), talk date & time.
   - Choose notification method: Email.
   - If Email: speaker email field.
   - Set reminder offsets: "1 week before", "1 day before", plus a custom offset (e.g., "2 hours before").
   - Each offset creates a separate reminder rule.
3. Edit / delete any talk they created.
4. List view: table of all their talks, with columns for speaker, title, date, notification method, and status of each reminder.
5. Automatic reminders via cron job (Vercel built-in).
6. Manual trigger button to run reminder check immediately.
7. Dark/Light mode toggle.
8. Custom splash screen and app icon with M logo.

---

## Database Schema (Supabase)

```sql
CREATE TABLE talks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  speaker_name TEXT NOT NULL,
  talk_title TEXT,
  talk_date TIMESTAMPTZ NOT NULL,
  notification_channel TEXT DEFAULT 'email',
  speaker_email TEXT,
  messenger_psid TEXT,
  messenger_opted_in BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reminder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talk_id UUID REFERENCES talks ON DELETE CASCADE,
  offset_label TEXT NOT NULL,
  offset_interval TEXT NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  is_sent BOOLEAN DEFAULT false,
  UNIQUE(talk_id, offset_label)
);

CREATE TABLE reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES reminder_rules ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT now(),
  response TEXT
);
```

---

## App URLs
- **Web App**: https://talk-reminder.vercel.app
- **APK**: Mate-Reminder.apk (local file)
- **GitHub**: https://github.com/Juankael37/talk-reminder