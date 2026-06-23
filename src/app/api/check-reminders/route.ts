import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { requireEnv, warnIfMissingServer } from '@/lib/env'
import { logger } from '@/lib/logger'
import { timingSafeEqualStr } from '@/lib/webhook-security'
import {
  applyRateLimit,
  genericError,
} from '@/lib/api-guard'

export const dynamic = 'force-dynamic'

type TalkRow = {
  id: string
  user_id: string
  speaker_name: string
  talk_title: string | null
  talk_date: string
  notification_channel: string
  speaker_email: string | null
  messenger_psid: string | null
  messenger_opted_in: boolean | null
  telegram_chat_id: string | null
  telegram_opted_in: boolean | null
}

type ReminderRuleRow = {
  id: string
  talk_id: string
  offset_label: string
  offset_interval: string
  scheduled_time: string
  is_sent: boolean
  talks: TalkRow | null
}

async function isAuthorized(request: Request): Promise<boolean> {
  const expected = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  const url = new URL(request.url)
  const querySecret = url.searchParams.get('secret')
  if (expected) {
    if (auth?.startsWith('Bearer ')) {
      const token = auth.slice('Bearer '.length)
      if (timingSafeEqualStr(token, expected)) {
        return true
      }
    }
    if (querySecret && timingSafeEqualStr(querySecret, expected)) {
      return true
    }
  }
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice('Bearer '.length).trim()
    if (token) {
      try {
        const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
        const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
        const supabase = createClient(supabaseUrl, serviceKey)
        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (user && !error) {
          return true
        }
        if (error) {
          logger.warn('check_reminders.auth_token_failed', { message: error.message })
        }
      } catch (err) {
        logger.error('check_reminders.auth_error', { message: err instanceof Error ? err.message : String(err) })
      }
    }
  }
  return false
}

const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    warnIfMissingServer('RESEND_API_KEY')
    return null
  }
  return new Resend(apiKey)
}

function tz(): string {
  return process.env.NEXT_PUBLIC_TIMEZONE || 'Asia/Manila'
}

function formatTalkDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: tz(),
  })
}

function formatTalkTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: tz(),
  })
}

const organizerNotifiedForRule = new Set<string>()

async function fetchOrganizerEmail(
  supabase: SupabaseAny,
  userId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId)
    if (error || !data?.user?.email) return null
    return data.user.email
  } catch (err) {
    logger.error('check_reminders.organizer_lookup_failed', {
      userId,
      message: err instanceof Error ? err.message : 'unknown',
    })
    return null
  }
}

async function notifyOrganizerOfFailure(
  resend: Resend | null,
  toEmail: string,
  talk: TalkRow,
  rule: ReminderRuleRow,
  reason: string
): Promise<void> {
  if (!resend) return
  const subject = `Reminder failed: ${talk.speaker_name} (${rule.offset_label})`
  const text = [
    `A scheduled reminder could not be delivered.`,
    ``,
    `Talk: ${talk.talk_title || '(untitled)'}`,
    `Speaker: ${talk.speaker_name} <${talk.speaker_email || 'no email'}`,
    `Scheduled: ${formatTalkDate(rule.scheduled_time)} at ${formatTalkTime(rule.scheduled_time)}`,
    `Offset: ${rule.offset_label}`,
    `Channel: ${talk.notification_channel}`,
    ``,
    `Reason: ${reason}`,
    ``,
    `Please contact the speaker manually if needed.`,
    `— Talk Reminder by Ortuma`,
  ].join('\n')
  try {
    const { error } = await resend.emails.send({
      from: 'Talk Reminder <reminder-noreply@ortuma.site>',
      to: toEmail,
      subject,
      text,
    })
    if (error) {
      logger.error('check_reminders.organizer_email_failed', {
        ruleId: rule.id,
        message: error.message,
      })
    } else {
      logger.info('check_reminders.organizer_notified', { ruleId: rule.id })
    }
  } catch (err) {
    logger.error('check_reminders.organizer_email_threw', {
      ruleId: rule.id,
      message: err instanceof Error ? err.message : 'unknown',
    })
  }
}

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    logger.warn('check_reminders.unauthorized', { ip: request.headers.get('x-forwarded-for') })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = applyRateLimit(request, 'check-reminders', { limit: 6, windowMs: 60_000 })
  if (!rl.allowed) return rl.response!

  try {
    const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl, serviceKey)

    const now = new Date().toISOString()

    const { data: dueRules, error: rulesError } = await supabase
      .from('reminder_rules')
      .select('*, talks(*)')
      .eq('is_sent', false)
      .lte('scheduled_time', now)

    if (rulesError) {
      logger.error('check_reminders.rules_query_failed', { message: rulesError.message })
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (!dueRules || dueRules.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, due: 0 })
    }

    const resend = getResend()
    let sentCount = 0
    let failedCount = 0

    for (const raw of dueRules) {
      const rule = raw as ReminderRuleRow
      const talk = rule.talks
      if (!talk) continue

      const channel = talk.notification_channel || 'email'

      if (channel === 'email') {
        if (!talk.speaker_email) {
          await recordFailureAndNotify(
            supabase, resend, rule, talk,
            'no_recipient',
            'Speaker has no email address on file.'
          )
          failedCount++
          continue
        }
        const ok = await sendEmailReminder(rule, talk, supabase, resend)
        if (ok) sentCount++
        else {
          await recordFailureAndNotify(
            supabase, resend, rule, talk,
            'email_dispatch_failed',
            'Email provider returned an error.'
          )
          failedCount++
        }
      } else if (channel === 'messenger') {
        if (!talk.messenger_opted_in || !talk.messenger_psid) {
          await recordFailureAndNotify(
            supabase, resend, rule, talk,
            'messenger_optin_missing',
            'Speaker has not opted in to Messenger yet. Ask them to send their email to your Facebook Page.'
          )
          failedCount++
          continue
        }
        const ok = await sendMessengerReminder(rule, talk, supabase)
        if (ok) sentCount++
        else {
          await recordFailureAndNotify(
            supabase, resend, rule, talk,
            'messenger_dispatch_failed',
            'Messenger API rejected the send.'
          )
          failedCount++
        }
      } else if (channel === 'telegram') {
        if (!talk.telegram_opted_in || !talk.telegram_chat_id) {
          await recordFailureAndNotify(
            supabase, resend, rule, talk,
            'telegram_optin_missing',
            'Speaker has not opted in to Telegram yet. Ask them to message your bot with their email.'
          )
          failedCount++
          continue
        }
        const ok = await sendTelegramReminder(rule, talk, supabase)
        if (ok) sentCount++
        else {
          await recordFailureAndNotify(
            supabase, resend, rule, talk,
            'telegram_dispatch_failed',
            'Telegram API rejected the send.'
          )
          failedCount++
        }
      } else {
        await recordFailureAndNotify(
          supabase, resend, rule, talk,
          'unknown_channel',
          `Unknown notification channel "${channel}".`
        )
        failedCount++
      }
    }

    organizerNotifiedForRule.clear()

    return NextResponse.json({
      ok: true,
      sent: sentCount,
      failed: failedCount,
      due: dueRules.length,
    })
  } catch (error) {
    return genericError('check-reminders', error)
  }
}

type SupabaseAny = SupabaseClient

async function recordFailureAndNotify(
  supabase: SupabaseAny,
  resend: Resend | null,
  rule: ReminderRuleRow,
  talk: TalkRow,
  kind: string,
  message: string
): Promise<void> {
  try {
    const { error: logError } = await supabase.from('reminder_logs').insert({
      rule_id: rule.id,
      response: `Failed: ${message}`,
      status: 'failed',
      error_message: message,
      channel: talk.notification_channel,
      recipient: recipientOf(talk),
      kind,
      organizer_notified_at: null,
    })
    if (logError) {
      logger.error('check_reminders.log_insert_failed', {
        ruleId: rule.id,
        message: logError.message,
      })
    } else {
      try {
        await supabase.from('reminder_rules').update({ is_sent: true }).eq('id', rule.id)
      } catch (err) {
        logger.error('check_reminders.mark_failed_sent_threw', {
          ruleId: rule.id,
          message: err instanceof Error ? err.message : 'unknown',
        })
      }
    }
  } catch (err) {
    logger.error('check_reminders.log_insert_threw', {
      ruleId: rule.id,
      message: err instanceof Error ? err.message : 'unknown',
    })
  }

  if (!resend) return
  if (organizerNotifiedForRule.has(rule.id)) return

  try {
    const { data: alreadyNotifiedRows, error: checkError } = await supabase
      .from('reminder_logs')
      .select('id')
      .eq('rule_id', rule.id)
      .eq('status', 'failed')
      .not('organizer_notified_at', 'is', null)
      .limit(1)
    if (checkError) {
      logger.error('check_reminders.organizer_check_failed', {
        ruleId: rule.id,
        message: checkError.message,
      })
      return
    }
    if (alreadyNotifiedRows && alreadyNotifiedRows.length > 0) return
  } catch (err) {
    logger.error('check_reminders.organizer_check_threw', {
      ruleId: rule.id,
      message: err instanceof Error ? err.message : 'unknown',
    })
    return
  }

  organizerNotifiedForRule.add(rule.id)

  const email = await fetchOrganizerEmail(supabase, talk.user_id)
  if (!email) {
    logger.warn('check_reminders.no_organizer_email', { ruleId: rule.id, userId: talk.user_id })
    return
  }
  await notifyOrganizerOfFailure(resend, email, talk, rule, message)

  try {
    await supabase
      .from('reminder_logs')
      .update({ organizer_notified_at: new Date().toISOString() })
      .eq('rule_id', rule.id)
      .eq('status', 'failed')
      .is('organizer_notified_at', null)
  } catch (err) {
    logger.error('check_reminders.organizer_notified_stamp_failed', {
      ruleId: rule.id,
      message: err instanceof Error ? err.message : 'unknown',
    })
  }
}

function recipientOf(talk: TalkRow): string {
  if (talk.notification_channel === 'messenger') return 'messenger:hidden'
  if (talk.notification_channel === 'telegram') return 'telegram:hidden'
  return talk.speaker_email || ''
}

async function sendEmailReminder(
  rule: ReminderRuleRow,
  talk: TalkRow,
  supabase: SupabaseAny,
  resend: Resend | null
): Promise<boolean> {
  if (!resend) {
    logger.warn('check_reminders.resend_unavailable_skip_update', { ruleId: rule.id })
    await supabase.from('reminder_logs').insert({
      rule_id: rule.id,
      response: 'Skipped: Resend not configured',
      status: 'skipped',
      error_message: 'RESEND_API_KEY is not set',
      channel: 'email',
      recipient: talk.speaker_email,
      kind: 'resend_unconfigured',
    })
    return false
  }

  const formattedDate = formatTalkDate(talk.talk_date)
  const formattedTime = formatTalkTime(talk.talk_date)

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #6366F1, #4F46E5); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
    .header p { margin: 8px 0 0 0; opacity: 0.9; font-size: 15px; }
    .content { padding: 35px 30px; }
    .greeting { font-size: 18px; color: #1E293B; margin-bottom: 24px; }
    .talk-card { background-color: #F8FAFC; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #6366F1; }
    .talk-title { font-size: 20px; font-weight: 600; color: #1E293B; margin: 0 0 16px 0; }
    .details { margin: 0; padding: 0; list-style: none; }
    .details li { margin: 12px 0; color: #64748B; font-size: 15px; }
    .details li strong { color: #1E293B; }
    .icon { margin-right: 8px; }
    .footer { background-color: #F1F5F9; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Reminder</h1>
      <p>Your upcoming talk</p>
    </div>
    <div class="content">
      <p class="greeting">Hi ${talk.speaker_name},</p>
      <p>This is a friendly reminder about your upcoming talk:</p>
      <div class="talk-card">
        <h3 class="talk-title">${talk.talk_title || 'Talk'}</h3>
        <ul class="details">
          <li><span class="icon">📅</span><strong>Date:</strong> ${formattedDate}</li>
          <li><span class="icon">🕐</span><strong>Time:</strong> ${formattedTime}</li>
          <li><span class="icon">⏱</span><strong>Reminder:</strong> ${rule.offset_label}</li>
        </ul>
      </div>
      <p>We're looking forward to your presentation!</p>
    </div>
    <div class="footer">
      <p>Sent via Talk Reminder by <strong>Ortuma</strong></p>
    </div>
  </div>
</body>
</html>`

  const plainText = `Hi ${talk.speaker_name},\n\nReminder about your upcoming talk:\n"${talk.talk_title || 'Talk'}"\n\nDate: ${formattedDate}\nTime: ${formattedTime}\nReminder: ${rule.offset_label}\n\n- Sent via Talk Reminder by Ortuma`

  try {
    const { error: sendError } = await resend.emails.send({
      from: 'Talk Reminder <reminder-noreply@ortuma.site>',
      to: talk.speaker_email!,
      subject: `⏰ Reminder: ${talk.talk_title || 'Your Talk'} is Coming Up`,
      html: htmlContent,
      text: plainText,
    })

    if (sendError) {
      throw new Error(sendError.message)
    }

    await supabase.from('reminder_rules').update({ is_sent: true }).eq('id', rule.id)
    await supabase.from('reminder_logs').insert({
      rule_id: rule.id,
      response: 'Sent via Email',
      status: 'success',
      channel: 'email',
      recipient: talk.speaker_email,
      kind: 'email_dispatch',
    })
    return true
  } catch (emailError) {
    logger.error('check_reminders.email_failed', {
      ruleId: rule.id,
      message: emailError instanceof Error ? emailError.message : 'unknown',
    })
    return false
  }
}

async function sendMessengerReminder(
  rule: ReminderRuleRow,
  talk: TalkRow,
  supabase: SupabaseAny
): Promise<boolean> {
  const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN
  if (!PAGE_ACCESS_TOKEN) {
    logger.error('check_reminders.messenger_token_missing', { ruleId: rule.id })
    return false
  }

  const formattedDate = formatTalkDate(talk.talk_date)
  const formattedTime = formatTalkTime(talk.talk_date)

  const messageText = `⏰ Reminder: ${talk.talk_title || 'Your Talk'} is Coming Up\n\nHi ${talk.speaker_name},\n\nThis is a friendly reminder about your upcoming talk:\n"${talk.talk_title || 'Talk'}"\n\n📅 Date: ${formattedDate}\n🕐 Time: ${formattedTime}\n⏱ Reminder: ${rule.offset_label}\n\nWe're looking forward to your presentation! (Sent via Talk Reminder by Ortuma)`

  const requestBody = {
    messaging_type: 'RESPONSE',
    recipient: {
      id: talk.messenger_psid,
    },
    message: {
      text: messageText,
    },
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      logger.error('check_reminders.messenger_api_error', {
        ruleId: rule.id,
        status: response.status,
        errorMessage: JSON.stringify(errorData),
      })
      return false
    }

    await supabase.from('reminder_rules').update({ is_sent: true }).eq('id', rule.id)
    await supabase.from('reminder_logs').insert({
      rule_id: rule.id,
      response: 'Sent via Messenger',
      status: 'success',
      channel: 'messenger',
      recipient: 'messenger:hidden',
      kind: 'messenger_dispatch',
    })
    return true
  } catch (error) {
    logger.error('check_reminders.messenger_failed', {
      ruleId: rule.id,
      message: error instanceof Error ? error.message : 'unknown',
    })
    return false
  }
}

async function sendTelegramReminder(
  rule: ReminderRuleRow,
  talk: TalkRow,
  supabase: SupabaseAny
): Promise<boolean> {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
  if (!TELEGRAM_BOT_TOKEN) {
    logger.error('check_reminders.telegram_token_missing', { ruleId: rule.id })
    return false
  }

  const formattedDate = formatTalkDate(talk.talk_date)
  const formattedTime = formatTalkTime(talk.talk_date)

  const messageText = `⏰ Reminder: ${talk.talk_title || 'Your Talk'} is Coming Up\n\nHi ${talk.speaker_name},\n\nThis is a friendly reminder about your upcoming talk:\n"${talk.talk_title || 'Talk'}"\n\n📅 Date: ${formattedDate}\n🕐 Time: ${formattedTime}\n⏱ Reminder: ${rule.offset_label}\n\nWe're looking forward to your presentation! (Sent via Talk Reminder by Ortuma)`

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: talk.telegram_chat_id,
        text: messageText,
      }),
    })

    if (!response.ok) {
      await response.json().catch(() => ({}))
      logger.error('check_reminders.telegram_api_error', {
        ruleId: rule.id,
        status: response.status,
      })
      return false
    }

    await supabase.from('reminder_rules').update({ is_sent: true }).eq('id', rule.id)
    await supabase.from('reminder_logs').insert({
      rule_id: rule.id,
      response: 'Sent via Telegram',
      status: 'success',
      channel: 'telegram',
      recipient: 'telegram:hidden',
      kind: 'telegram_dispatch',
    })
    return true
  } catch (error) {
    logger.error('check_reminders.telegram_failed', {
      ruleId: rule.id,
      message: error instanceof Error ? error.message : 'unknown',
    })
    return false
  }
}

export async function GET(request: Request) {
  return POST(request)
}