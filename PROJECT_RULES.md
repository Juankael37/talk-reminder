# Mate Reminder - Project Rules & Session Tracking

## Current Project Status
Last Updated: 2026-04-22
Current Phase: Phase 5 (Messenger API Integration) - IN PROGRESS
Current Task: Meta Messenger API setup - waiting for credentials

---

## Session Tracking

### Sessions Completed
| # | Date | Phase | Tasks Completed | Notes |
|---|------|-------|----------------|-------|
| 1 | 2025-04-20 | Planning | Project plan, UI/UX design, database schema | Initial planning session |
| 2 | 2025-04-20 | Implementation | Built Next.js app, auth, dashboard, API | Main build session |
| 3 | 2026-04-21 | Deployment | Build fix, GitHub push ready | Ready for Vercel deploy |
| 4 | 2026-04-22 | Brand Update | Renamed to Mate Reminder, added Messenger link | Messenger link in emails |
| 5 | 2026-04-22 | Messenger API Setup | Meta developer account, app created | Waiting for credentials |

### Active Session
- Start Time: 2026-04-22
- Current Task: Meta Messenger API integration
- Notes: User has Meta App, Page Access Token obtained. Need to complete setup tomorrow.

---

## To-Do List (Live Tracking)

### Phase 1: Foundation
- [x] Initialize Next.js 14 project with TypeScript + Tailwind
- [x] Set up Supabase client and auth helpers
- [x] Configure Capacitor for mobile wrapper
- [x] Implement Login/Signup pages with Supabase Auth
- [x] Set up Supabase project and database schema

### Phase 2: Core Features
- [x] Build Dashboard with talks list
- [x] Create Add/Edit Talk form with validation
- [x] Implement reminder offset selector
- [x] Add delete talk functionality
- [x] Implement reminders API route with Email (nodemailer)

### Phase 5: Messenger Integration
- [x] Meta Developer Account setup
- [x] Create Meta App with Messenger product
- [x] Get Page Access Token
- [ ] Get App Secret from Meta Dashboard
- [ ] Create verify token
- [ ] Add environment variables
- [ ] Create welcome email API route
- [ ] Create Messenger webhook API route
- [ ] Create Messenger send API route
- [ ] Update check-reminders to support Messenger
- [ ] Update database schema (add messenger_psid, messenger_opted_in columns)
- [ ] Set up webhook in Meta Developer Portal
- [ ] Test end-to-end

---

## Key References
- Database: Supabase PostgreSQL with RLS
- Email: nodemailer (Gmail)
- Messenger: Meta Messenger Platform API
- Mobile: Capacitor (Android/iOS)
- Hosting: Vercel
- Scheduling: Vercel Cron (built-in)

---

## Design System
- Primary: #6366F1 (Indigo-500)
- Primary Dark: #4F46E5 (Indigo-600)
- Secondary: #F1F5F9 (Slate-100)
- Surface: #FFFFFF
- Text Primary: #1E293B (Slate-800)
- Text Secondary: #64748B (Slate-500)
- Success: #10B981 (Emerald-500)
- Warning: #F59E0B (Amber-500)
- Error: #EF4444 (Red-500)

---

## Next Steps (Resume Tomorrow)

### Meta Messenger API Setup

1. **Get credentials from Meta Developer Portal**:
   - Page Access Token (already obtained)
   - App Secret: https://developers.facebook.com/apps/936591262528758/dashboard/
   - Create a verify token (random string)

2. **Add to Vercel Environment Variables**:
   - `MESSENGER_PAGE_ACCESS_TOKEN`
   - `MESSENGER_APP_SECRET`
   - `MESSENGER_VERIFY_TOKEN`

3. **Set up webhook in Meta Developer Portal**:
   - URL: `https://talk-reminder-8f7uwaasp-juankael37s-projects.vercel.app/api/messenger/webhook`
   - Verify Token: (your verify token)
   - Subscribe to: `messages` event

### Reference Files
- `META_SETUP.md` - Complete Meta setup guide