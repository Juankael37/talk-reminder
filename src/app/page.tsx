import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TextLogo } from '@/components/TextLogo'
import { BetaBanner } from '@/components/BetaBanner'

const mockData = [
  { speaker: 'Maria Santos', talk: 'Opening Keynote', date: 'Jul 12', week1: 'sent', day1: 'pending' },
  { speaker: 'James Reyes', talk: 'AI in Production', date: 'Jul 12', week1: 'sent', day1: 'sent' },
  { speaker: 'Lea Cruz', talk: 'Design Systems 101', date: 'Jul 13', week1: 'failed', day1: null },
] as const

function Badge({ status }: { status: string | null }) {
  if (status === 'sent') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#22C55E]/12 px-2.5 py-1 text-xs font-medium text-[#16A34A] ring-1 ring-inset ring-[#22C55E]/25 dark:text-[#4ADE80]">
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Sent
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F59E0B]/12 px-2.5 py-1 text-xs font-medium text-[#D97706] ring-1 ring-inset ring-[#F59E0B]/25 dark:text-[#FBBF24]">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        Pending
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#EF4444]/12 px-2.5 py-1 text-xs font-medium text-[#DC2626] ring-1 ring-inset ring-[#EF4444]/25 dark:text-[#F87171]">
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Failed
      </span>
    )
  }
  return <span className="text-xs text-[#888888]">—</span>
}

const steps = [
  {
    n: '1',
    title: 'Add your talk',
    body: "Enter the speaker's name, email, and event date. Choose their preferred reminder channel — Email or Telegram (Messenger coming soon).",
  },
  {
    n: '2',
    title: 'Speakers opt in once',
    body: 'Your speaker sends a message to your Telegram bot with their email address. That links their account. No app to install, no account to create — just one message.',
  },
  {
    n: '3',
    title: 'Reminders go out automatically',
    body: 'At your configured offsets — 1 week and 1 day by default, or custom hours/days — Talk Reminder delivers the reminder and logs whether it succeeded or failed.',
  },
]

const worksNow = [
  'Email reminders via Resend',
  'Telegram reminders via bot',
  'Dashboard with per-talk, per-offset sent/pending/failed status',
  'Failure alerts — you get emailed if a reminder fails',
  'Custom reminder offsets (hours or days)',
  'Multi-user support',
  'Dark mode, fully responsive',
  'GDPR-compliant — account deletion + Meta data-deletion callback',
]

const comingSoon = [
  'Facebook Messenger reminders (channel is integrated but not fully stable yet)',
  'Speaker self-service portal',
  'Calendar integrations',
]

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session?.user) {
    redirect('/dashboard')
  }

  return (
    <div className="relative isolate min-h-screen text-[#111111] dark:text-[#F0F0F0]">
      {/* Ambient background: base wash + top glow + masked dot grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[#FAFAFA] dark:bg-[#0A0A0A]" />
        <div className="absolute left-1/2 top-[-8%] h-[480px] w-[900px] max-w-[130vw] -translate-x-1/2 rounded-full bg-[#FF6B00]/10 blur-[150px] dark:bg-[#FF6B00]/15" />
        <div className="absolute inset-0 bg-dot-grid" />
      </div>

      <BetaBanner />

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-[#E5E5E5]/70 bg-white/70 backdrop-blur-xl dark:border-[#2A2A2A]/70 dark:bg-[#0A0A0A]/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#FF8527] shadow-md shadow-[#FF6B00]/30">
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
              </svg>
            </span>
            <TextLogo size="sm" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-medium text-[#111111] transition-colors hover:bg-[#E5E5E5]/70 dark:text-[#F0F0F0] dark:hover:bg-[#2A2A2A]/70"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8527] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#FF6B00]/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#FF6B00]/35"
            >
              Join the Beta
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-20 pb-16 sm:px-6 sm:pt-28 sm:pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <span
            className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/25 bg-[#FF6B00]/[0.06] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#FF6B00]"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF6B00] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#FF6B00]" />
            </span>
            Beta
          </span>

          <h1
            className="animate-fade-in-up mt-6 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl sm:leading-[1.05]"
            style={{ animationDelay: '80ms' }}
          >
            Automated speaker reminders.
            <span className="mt-1 block bg-gradient-to-r from-[#FF6B00] via-[#FF7A1A] to-[#FF9148] bg-clip-text text-transparent">
              No manual follow-ups.
            </span>
          </h1>

          <p
            className="animate-fade-in-up mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#666666] dark:text-[#A0A0A0]"
            style={{ animationDelay: '160ms' }}
          >
            Add your talks, set offsets, and Talk Reminder sends reminders via Email or Telegram — automatically. Facebook Messenger support is coming soon.
          </p>

          <div
            className="animate-fade-in-up mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            style={{ animationDelay: '240ms' }}
          >
            <Link
              href="/signup"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8527] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#FF6B00]/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#FF6B00]/40 sm:w-auto"
            >
              Join the Beta — it&apos;s free
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E5E5E5] bg-white/60 px-6 py-3.5 text-sm font-medium text-[#111111] backdrop-blur-sm transition-all hover:bg-white hover:shadow-md dark:border-[#2A2A2A] dark:bg-white/[0.03] dark:text-[#F0F0F0] dark:hover:bg-white/[0.06] sm:w-auto"
            >
              See how it works
            </a>
          </div>

          {/* Channel strip */}
          <div className="animate-fade-in-up mt-10 flex flex-col items-center gap-3" style={{ animationDelay: '320ms' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#999999]">Delivered via</p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E5E5] bg-white/70 px-3 py-1.5 text-xs font-medium text-[#444444] backdrop-blur-sm dark:border-[#2A2A2A] dark:bg-white/[0.04] dark:text-[#CCCCCC]">
                <svg className="h-3.5 w-3.5 text-[#FF6B00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E5E5] bg-white/70 px-3 py-1.5 text-xs font-medium text-[#444444] backdrop-blur-sm dark:border-[#2A2A2A] dark:bg-white/[0.04] dark:text-[#CCCCCC]">
                <svg className="h-3.5 w-3.5 text-[#FF6B00]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
                </svg>
                Telegram
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#E5E5E5] bg-white/40 px-3 py-1.5 text-xs font-medium text-[#888888] backdrop-blur-sm dark:border-[#2A2A2A] dark:bg-white/[0.02]">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.97 7.97 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Messenger
                <span className="rounded-full bg-[#FF6B00]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#FF6B00]">Soon</span>
              </span>
            </div>
          </div>
        </div>

        {/* Mock dashboard window */}
        <div className="animate-fade-in-up relative mx-auto mt-16 max-w-4xl" style={{ animationDelay: '400ms' }}>
          <div aria-hidden className="absolute inset-x-10 -top-8 -z-10 h-full rounded-[2.5rem] bg-[#FF6B00]/10 blur-3xl dark:bg-[#FF6B00]/12" />
          <div aria-hidden className="absolute inset-x-4 -bottom-6 -z-10 rounded-[2rem] bg-black/5 blur-2xl dark:bg-black/40" />
          <div className="overflow-hidden rounded-2xl border border-[#E5E5E5]/80 bg-white shadow-2xl shadow-black/10 ring-1 ring-black/[0.02] dark:border-[#2A2A2A] dark:bg-[#141414] dark:shadow-black/40">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-[#E5E5E5]/80 bg-[#FAFAFA]/80 px-4 py-3 dark:border-[#2A2A2A]/80 dark:bg-[#1A1A1A]/80">
              <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
              <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
              <span className="h-3 w-3 rounded-full bg-[#28C840]" />
              <div className="ml-3 hidden items-center gap-1.5 text-xs font-medium text-[#999999] dark:text-[#777777] sm:flex">
                <svg className="h-3.5 w-3.5 text-[#FF6B00]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                </svg>
                talk-reminder/dashboard
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E5E5]/80 dark:border-[#2A2A2A]/80">
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#999999]">Speaker</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#999999]">Talk Title</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#999999]">Date</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#999999]">1-week</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#999999]">1-day</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]/70 dark:divide-[#2A2A2A]/70">
                  {mockData.map((row) => (
                    <tr key={row.speaker} className="transition-colors hover:bg-[#FAFAFA] dark:hover:bg-white/[0.02]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6B00] to-[#FF8527] text-xs font-semibold text-white">
                            {row.speaker.charAt(0)}
                          </span>
                          <span className="text-sm font-medium">{row.speaker}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#666666] dark:text-[#A0A0A0]">{row.talk}</td>
                      <td className="px-5 py-4 text-sm text-[#666666] dark:text-[#A0A0A0]">{row.date}</td>
                      <td className="px-5 py-4"><Badge status={row.week1} /></td>
                      <td className="px-5 py-4"><Badge status={row.day1} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-[#E5E5E5]/70 md:hidden dark:divide-[#2A2A2A]/70">
              {mockData.map((row) => (
                <div key={row.speaker} className="space-y-3 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6B00] to-[#FF8527] text-sm font-semibold text-white">
                      {row.speaker.charAt(0)}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{row.speaker}</p>
                      <p className="text-xs text-[#999999]">{row.date}</p>
                    </div>
                  </div>
                  <p className="text-sm text-[#666666] dark:text-[#A0A0A0]">{row.talk}</p>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-[#999999]"><span>1-week:</span><Badge status={row.week1} /></div>
                    <div className="flex items-center gap-1.5 text-xs text-[#999999]"><span>1-day:</span><Badge status={row.day1} /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-[#E5E5E5]/70 bg-white/60 py-20 backdrop-blur-sm dark:border-[#2A2A2A]/70 dark:bg-[#0F0F0F]/40 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF6B00]">How It Works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Three steps. Zero spreadsheets.</h2>
            <p className="mt-3 text-[#666666] dark:text-[#A0A0A0]">From sign-up to your first automated reminder in under two minutes.</p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.n}
                className="group rounded-2xl border border-[#E5E5E5]/80 bg-white p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[#FF6B00]/30 hover:shadow-xl hover:shadow-[#FF6B00]/5 dark:border-[#2A2A2A] dark:bg-[#161616]"
              >
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF6B00] to-[#FF8527] text-base font-bold text-white shadow-lg shadow-[#FF6B00]/25 transition-transform duration-300 group-hover:scale-110">
                  {s.n}
                </span>
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[#666666] dark:text-[#A0A0A0]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's working in beta */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">What&apos;s working in beta</h2>
            <p className="mt-3 text-[#666666] dark:text-[#A0A0A0]">Honest about the state of things — here&apos;s exactly what ships today.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-[#E5E5E5]/80 bg-white p-7 transition-all duration-300 hover:shadow-xl dark:border-[#2A2A2A] dark:bg-[#161616]">
              <h3 className="flex items-center gap-2.5 text-lg font-semibold text-[#16A34A] dark:text-[#4ADE80]">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#22C55E]/12 ring-1 ring-inset ring-[#22C55E]/25">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
                Works Now
              </h3>
              <ul className="mt-5 space-y-3">
                {worksNow.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#22C55E]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-[#333333] dark:text-[#CCCCCC]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-[#E5E5E5]/80 bg-white p-7 transition-all duration-300 hover:shadow-xl dark:border-[#2A2A2A] dark:bg-[#161616]">
              <h3 className="flex items-center gap-2.5 text-lg font-semibold text-[#FF6B00]">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF6B00]/12 ring-1 ring-inset ring-[#FF6B00]/25">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" strokeWidth={2} />
                    <path strokeLinecap="round" strokeWidth={2} d="M12 7v5l3 3" />
                  </svg>
                </span>
                Coming Soon
              </h3>
              <ul className="mt-5 space-y-3">
                {comingSoon.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed">
                    <span className="mt-1 block h-4 w-4 shrink-0 rounded-full border-2 border-[#FF6B00]/60" />
                    <span className="text-[#333333] dark:text-[#CCCCCC]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Channel setup callout */}
      <section className="pb-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex gap-4 rounded-2xl border border-[#FF6B00]/20 bg-[#FF6B00]/[0.04] p-6 dark:bg-[#FF6B00]/[0.05]">
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#FF6B00] shadow-sm sm:flex dark:bg-white/10">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-[#111111] dark:text-[#F0F0F0]">A note on channel setup</p>
              <p className="mt-1.5 text-sm leading-relaxed text-[#666666] dark:text-[#A0A0A0]">
                Telegram and Messenger require a one-time bot setup on your end — you&apos;ll need to connect your Telegram bot token or Facebook Page to your Talk Reminder account. Email works out of the box. Setup instructions are in the dashboard once you sign up.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="my-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-[2rem] px-6 py-16 text-center sm:px-16 sm:py-20">
            <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-[#FF6B00] via-[#FF7A1A] to-[#FF9148]" />
            <div aria-hidden className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:22px_22px]" />
            <div aria-hidden className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
            <div aria-hidden className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-[#FF3D00]/30 blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl font-bold text-[#1A0A00] sm:text-4xl">Early access is free. Help us build this right.</h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-[#1A0A00]/80">
                Use Talk Reminder for your next event and tell us what&apos;s broken. That&apos;s the deal.
              </p>
              <Link
                href="/signup"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#1A0A00] px-8 py-3.5 text-sm font-semibold text-white shadow-xl shadow-black/20 transition-all hover:-translate-y-0.5 hover:bg-black"
              >
                Create your free account
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E5E5]/70 bg-white/60 py-12 backdrop-blur-sm dark:border-[#2A2A2A]/70 dark:bg-[#0F0F0F]/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <Link href="/" className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#FF8527] shadow-md shadow-[#FF6B00]/30">
                  <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                  </svg>
                </span>
                <TextLogo size="sm" />
              </Link>
              <p className="mt-3 text-sm text-[#666666] dark:text-[#A0A0A0]">
                Automated speaker reminders for event organizers.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/login" className="text-[#666666] transition-colors hover:text-[#FF6B00] dark:text-[#A0A0A0]">Sign In</Link>
              <Link href="/privacy" className="text-[#666666] transition-colors hover:text-[#FF6B00] dark:text-[#A0A0A0]">Privacy Policy</Link>
              <Link href="/terms" className="text-[#666666] transition-colors hover:text-[#FF6B00] dark:text-[#A0A0A0]">Terms</Link>
            </div>
            <div className="text-sm text-[#666666] dark:text-[#A0A0A0]">
              <p className="font-medium text-[#111111] dark:text-[#F0F0F0]">by Ortuma</p>
              <p className="mt-1">Built with Next.js, Supabase, and Resend.</p>
            </div>
          </div>
          <div className="mt-10 border-t border-[#E5E5E5]/70 pt-6 text-center text-xs text-[#999999] dark:border-[#2A2A2A]/70 dark:text-[#777777]">
            &copy; {new Date().getFullYear()} Ortuma. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
