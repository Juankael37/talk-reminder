# Talk Reminder - Project Rules & Session Tracking

## Current Project Status
Last Updated: 2025-04-20
Current Phase: Phase 1 - Foundation (Complete)
Current Task: Ready for Supabase setup

---

## Session Tracking

### Sessions Completed
| # | Date | Phase | Tasks Completed | Notes |
|---|------|-------|----------------|-------|
| 1 | 2025-04-20 | Planning | Project plan, UI/UX design, database schema | Initial planning session |
| 2 | 2025-04-20 | Implementation | Built Next.js app, auth, dashboard, API | Main build session |

### Active Session
- Start Time: 2025-04-20
- Current Task: Build verification complete
- Notes: All core features implemented, awaiting Supabase setup

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
- [x] Implement reminders API route with Twilio

### Phase 3: Mobile Build
- [ ] Build Android APK
- [ ] Build iOS (requires Mac)

### Phase 4: Deployment
- [ ] Deploy to Vercel
- [ ] Configure cron-job.org

---

## Implementation Rules

1. **Session Start Protocol**
   - Read PROJECT.md and PROJECT_RULES.md first
   - Check current phase and active tasks
   - Confirm with user what to work on

2. **Task Completion Protocol**
   - Mark todo item as completed IMMEDIATELY after finishing
   - Update session notes
   - Update "Current Project Status" in this file

3. **Reference Files**
   - PROJECT.md: Core specifications
   - PROJECT_RULES.md: This file (session tracking + rules)
   - PROJECT_PLAN.md: UI/UX design, tech stack, phases

4. **Code Standards**
   - TypeScript required
   - Tailwind CSS for styling
   - Supabase Auth for authentication
   - Follow existing code patterns

---

## Key References
- Database: Supabase PostgreSQL with RLS
- SMS: Twilio API
- Mobile: Capacitor (Android/iOS)
- Hosting: Vercel
- Scheduling: cron-job.org
- Font: Inter (Google Fonts)

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

## Next Steps (User Action Required)

### 1. Set up Supabase
Go to https://supabase.com and create a project, then:
1. Run the SQL from PROJECT.md in Supabase SQL Editor
2. Update `.env.local` with your Supabase URL and Anon Key

### 2. Set up Twilio
1. Create Twilio account at https://twilio.com
2. Get Account SID, Auth Token, and Phone Number
3. Update `.env.local` with Twilio credentials

### 3. Build Android APK
Run: `npx cap add android && npx cap sync android`