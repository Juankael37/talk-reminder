# Talk Reminder - Project Plan

## 1. Project Overview

A mobile app (Android & iOS via Capacitor) that lets users schedule automated SMS reminders for talk speakers. Users can set multiple reminder offsets (e.g., 1 week before, 1 day before, custom time) before a talk date.

**Tech Stack:**
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Email**: nodemailer (Gmail)
- **Mobile Wrapper**: Capacitor
- **Hosting**: Vercel
- **Scheduling**: cron-job.org (free)

---

## 2. Database Schema (Supabase)

```sql
-- Talks table
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

-- Reminder rules (one per offset)
CREATE TABLE reminder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talk_id UUID REFERENCES talks ON DELETE CASCADE,
  offset_label TEXT NOT NULL,
  offset_interval TEXT NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  is_sent BOOLEAN DEFAULT false,
  UNIQUE(talk_id, offset_label)
);

-- Reminder logs
CREATE TABLE reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES reminder_rules ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT now(),
  response TEXT
);

-- Enable RLS policies (as specified in PROJECT.md)
```

---

## 3. API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/callback/route.ts` | GET | Supabase auth callback |
| `/api/talks/route.ts` | GET, POST | List/create talks |
| `/api/talks/[id]/route.ts` | GET, PUT, DELETE | Single talk operations |
| `/api/check-reminders/route.ts` | GET, POST | Trigger reminder check (cron + manual) |
| `/api/reminder-logs/route.ts` | GET | Fetch reminder logs |

---

## 4. UI/UX Design

### Design System - Modern & Clean

**Color Palette:**
| Role | Color | Usage |
|------|-------|-------|
| Primary | `#6366F1` (Indigo-500) | CTAs, active states |
| Primary Dark | `#4F46E5` (Indigo-600) | Hover states |
| Secondary | `#F1F5F9` (Slate-100) | Backgrounds |
| Surface | `#FFFFFF` | Cards, modals |
| Text Primary | `#1E293B` (Slate-800) | Headlines |
| Text Secondary | `#64748B` (Slate-500) | Body, labels |
| Success | `#10B981` (Emerald-500) | Sent status |
| Warning | `#F59E0B` (Amber-500) | Pending status |
| Error | `#EF4444` (Red-500) | Errors, delete |

**Typography:**
- Font Family: `Inter` (Google Fonts)
- Headlines: 600 weight
- Body: 400 weight

### Screen Structure

```
┌─────────────────────────────────────┐
│           Talk Reminder             │
│            [Logo/Icon]              │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐     │
│  │    📋 Dashboard            │     │
│  │    Total Talks: X           │     │
│  │    Pending: X  | Sent: X   │     │
│  └─────────────────────────────┘     │
│                                     │
│  [ + Add Talk ]  [ ↻ Run Check ]   │
│                                     │
│  ┌─────────────────────────────┐     │
│  │  Talks List (Table)        │     │
│  │  Speaker | Date | Status   │     │
│  └─────────────────────────────┘     │
└─────────────────────────────────────┘
```

### Key Screens

| Screen | Purpose |
|--------|---------|
| Login/Signup | Email + password auth |
| Dashboard | Stats overview, quick actions, talks list |
| Add/Edit Talk | Form: speaker name, phone, date/time, reminder offsets |
| Talk Details | View single talk, reminder status |
| Settings | Profile, logout |

---

## 5. Implementation Phases

### Phase 1: Foundation
- [x] Initialize Next.js 14 project
- [ ] Set up Supabase project + database schema
- [ ] Configure Capacitor for mobile wrapper
- [ ] Implement Login/Signup pages with Supabase Auth

### Phase 2: Core Features
- [ ] Build Dashboard with talks list
- [ ] Create Add/Edit Talk form
- [ ] Implement reminder offset selector
- [ ] Add delete talk functionality
- [ ] Implement `/api/check-reminders` with Twilio

### Phase 3: Mobile Build
- [ ] Build Android APK
- [ ] Build iOS (requires Mac)

### Phase 4: Deployment
- [ ] Deploy to Vercel
- [ ] Configure cron-job.org

---

## 6. Cost Estimates

| Service | Free Tier | Paid |
|---------|-----------|------|
| Vercel | ✓ (hobby) | $20/mo |
| Supabase | ✓ 500MB DB | $25/mo |
| Twilio | ✓ $15 credit | ~$1/100 SMS |
| cron-job.org | ✓ 5 jobs | Free sufficient |
| Capacitor | ✓ | Free |

**Target Cost: $0/mo**