# Mate Reminder - Project Plan

## 1. Project Overview
A mobile app (Android & iOS via Capacitor) that lets users schedule automated reminders for speakers via Email. Users can set multiple reminder offsets (e.g., 1 week before, 1 day before, custom time) before a talk date.

**Tech Stack:**
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Email**: nodemailer (Gmail)
- **Mobile Wrapper**: Capacitor
- **Hosting**: Vercel
- **Scheduling**: Vercel Cron (built-in)

## 2. Database Schema

```sql
CREATE TABLE talks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  speaker_name TEXT NOT NULL,
  talk_title TEXT,
  talk_date TIMESTAMPTZ NOT NULL,
  notification_channel TEXT DEFAULT 'email',
  speaker_email TEXT,
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

-- RLS policies enabled
```

## 3. API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/callback/route.ts` | GET | Supabase auth callback |
| `/api/check-reminders/route.ts` | GET, POST | Trigger reminder check (cron + manual) |

## 4. UI/UX Design

### Design System
- **Primary**: #6366F1 (Indigo-500)
- **Primary Dark**: #4F46E5 (Indigo-600)
- **Secondary**: #F1F5F9 (Slate-100)
- **Surface**: #FFFFFF
- **Text Primary**: #1E293B (Slate-800)
- **Text Secondary**: #64748B (Slate-500)
- **Success**: #10B981 (Emerald-500)
- **Warning**: #F59E0B (Amber-500)
- **Error**: #EF4444 (Red-500)
- **Dark Background**: #0F172A
- **Dark Surface**: #1E293B

### Key Features
- **Dark/Light Mode Toggle**: Persisted in localStorage
- **M Logo**: Custom M letter icon in indigo/purple gradient
- **Splash Screen**: Large M with brand name on gradient background

### Screens
- Login: Email + password auth with M logo header
- Signup: Email + password + confirm password
- Dashboard: Stats, talks list, add talk modal, run check button

## 5. Implementation Status

### Phase 1: Foundation ✓
- [x] Initialize Next.js 14 project
- [x] Set up Supabase project + database schema
- [x] Configure Capacitor for mobile wrapper
- [x] Implement Login/Signup pages with Supabase Auth

### Phase 2: Core Features ✓
- [x] Build Dashboard with talks list
- [x] Create Add Talk form with validation
- [x] Implement reminder offset selector
- [x] Add delete talk functionality
- [x] Implement `/api/check-reminders` with Email (nodemailer)

### Phase 3: Mobile Build ✓
- [x] Build Android APK with custom M icon
- [x] Splash screen with M logo + brand text

### Phase 4: Deployment ✓
- [x] Deploy to Vercel
- [x] Configure Vercel cron

### Phase 5: Messenger Integration
- [ ] Future: Add Facebook Messenger support

## 6. Cost

| Service | Free Tier |
|---------|-----------|
| Vercel | ✓ (hobby) |
| Supabase | ✓ 500MB |
| Gmail | ✓ (personal) |
| Capacitor | ✓ Free |

**Target Cost: $0/mo**

## 7. App Resources
- **Web**: https://talk-reminder.vercel.app
- **APK**: Mate-Reminder.apk
- **GitHub**: https://github.com/Juankael37/talk-reminder