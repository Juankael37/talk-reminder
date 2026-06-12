---
name: Talk Reminder
shortDescription: Automated multi-channel speaker reminder system for event organizers.
video: /talk_reminder.mp4
tech:
  - Next.js
  - Supabase
  - Capacitor
  - TypeScript
  - Tailwind CSS
features:
  - Multi-channel notifications via Email, Facebook Messenger, and Telegram
  - Flexible reminder scheduling with preset and custom offsets
  - Automated background delivery managed by Vercel Cron jobs
  - Full CRUD interface for managing talks and speaker details
  - Cross-platform support (Web and native Android APK)
  - Light/Dark mode with custom splash screens and app icons
  - Built-in opt-in mechanism for bot-based messaging channels
techStack:
  - Next.js 14 (App Router)
  - TypeScript
  - Tailwind CSS
  - Supabase (Auth & PostgreSQL)
  - Capacitor (Android)
  - Resend
  - Meta Messenger & Telegram Bot APIs
  - Vercel Cron
pages:
  - /
  - /dashboard
  - /login
  - /signup
  - /privacy
  - /terms
workflowMermaid: |
  graph TD
    N0["User signs up logs Supabase"]
    N1["Add talk speaker, title, date"]
    N2["Choose notification method Email, Facebook"]
    N3["If Messenger Telegram → Speaker"]
    N4["speaker message bot first receive"]
    N5["Set reminder offsets 1 week,"]
    N6["Saved Supabase DB talks +"]
    N7["Vercel cron job fires checks"]
    N8["Email reminder Telegram reminder Messenger"]
    N9["Resend Telegram Bot API Meta"]
    N10["Logged to reminder_logs table"]
    N11["sent status + API response"]
    N0 --> N1
    N1 --> N2
    N2 --> N3
    N3 --> N4
    N4 --> N5
    N5 --> N6
    N6 --> N7
    N7 --> N8
    N8 --> N9
    N9 --> N10
    N10 --> N11
---

Talk Reminder is a cross-platform scheduling tool designed for event organizers to automate speaker follow-ups. By integrating directly with Supabase for data management and Vercel Cron for scheduled tasks, the application eliminates manual communication overhead, ensuring speakers stay informed about their scheduled talks through email, Telegram, or Facebook Messenger.

Built with Next.js and Capacitor, the platform functions seamlessly as both a responsive web dashboard and a native Android application. It features a robust rule-based engine that allows organizers to define flexible reminder offsets, ensuring notifications are dispatched precisely when needed across various communication channels.
