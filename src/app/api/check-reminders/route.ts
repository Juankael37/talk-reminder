import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const getTransporter = () => {
  const email = process.env.EMAIL_USER
  const password = process.env.EMAIL_PASS

  if (!email || !password) {
    console.log('No email config - emails will be logged only')
    return null
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: email, pass: password },
  })
}

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
      return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 })
    }
    if (!serviceKey) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const now = new Date().toISOString()
    console.log('Checking for reminders at', now)

    const { data: dueRules, error: rulesError } = await supabase
      .from('reminder_rules')
      .select('*, talks(*)')
      .eq('is_sent', false)
      .lte('scheduled_time', now)

    if (rulesError) {
      return NextResponse.json({ error: rulesError.message }, { status: 500 })
    }

    if (!dueRules || dueRules.length === 0) {
      return NextResponse.json({ message: 'No reminders due', sent: 0 })
    }

    console.log('Found due rules:', dueRules.length)
    const transporter = getTransporter()
    let sentCount = 0

    for (const rule of dueRules) {
      const talk = (rule as any).talks
      if (!talk) continue

      const channel = talk.notification_channel || 'email'

      if (channel === 'email' && talk.speaker_email) {
        await sendEmailReminder(rule, talk, supabase, transporter)
        sentCount++
      } else if (channel === 'messenger' && talk.messenger_psid && talk.messenger_opted_in) {
        await sendMessengerReminder(rule, talk, supabase)
        sentCount++
      } else if (channel === 'messenger') {
        console.log(`Talk ${talk.id} uses messenger but speaker has not opted in.`)
      } else if (channel === 'telegram' && talk.telegram_chat_id && talk.telegram_opted_in) {
        await sendTelegramReminder(rule, talk, supabase)
        sentCount++
      } else if (channel === 'telegram') {
        console.log(`Talk ${talk.id} uses telegram but speaker has not opted in.`)
      }
    }

    return NextResponse.json({ message: 'Done', sent: sentCount })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 })
  }
}

async function sendEmailReminder(rule: any, talk: any, supabase: any, transporter: any) {
  console.log('Processing email for talk:', talk.speaker_name)

  const tz = process.env.NEXT_PUBLIC_TIMEZONE || 'Asia/Manila'
  const talkDate = new Date(talk.talk_date)
  const formattedDate = talkDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: tz })
  const formattedTime = talkDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone: tz })

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
    if (transporter) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: talk.speaker_email,
        subject: `⏰ Reminder: ${talk.talk_title || 'Your Talk'} is Coming Up`,
        html: htmlContent,
        text: plainText,
      })
      console.log('Email sent to:', talk.speaker_email)
    }

    await supabase.from('reminder_rules').update({ is_sent: true }).eq('id', rule.id)
    await supabase.from('reminder_logs').insert({ rule_id: rule.id, response: 'Sent via Email' })
  } catch (emailError) {
    console.error('Email error:', emailError)
  }
}

async function sendMessengerReminder(rule: any, talk: any, supabase: any) {
  console.log('Processing messenger for talk:', talk.speaker_name)

  const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN
  if (!PAGE_ACCESS_TOKEN) {
    console.error('Missing MESSENGER_PAGE_ACCESS_TOKEN')
    return
  }

  const tz = process.env.NEXT_PUBLIC_TIMEZONE || 'Asia/Manila'
  const talkDate = new Date(talk.talk_date)
  const formattedDate = talkDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: tz })
  const formattedTime = talkDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone: tz })

  const messageText = `⏰ Reminder: ${talk.talk_title || 'Your Talk'} is Coming Up\n\nHi ${talk.speaker_name},\n\nThis is a friendly reminder about your upcoming talk:\n"${talk.talk_title || 'Talk'}"\n\n📅 Date: ${formattedDate}\n🕐 Time: ${formattedTime}\n⏱ Reminder: ${rule.offset_label}\n\nWe're looking forward to your presentation! (Sent via Talk Reminder by Ortuma)`

  const requestBody = {
    messaging_type: 'MESSAGE_TAG',
    tag: 'CONFIRMED_EVENT_UPDATE',
    recipient: {
      id: talk.messenger_psid
    },
    message: {
      text: messageText
    }
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Meta Send API error:', JSON.stringify(errorData))
      return
    }

    console.log('Messenger message sent to:', talk.speaker_name)
    await supabase.from('reminder_rules').update({ is_sent: true }).eq('id', rule.id)
    await supabase.from('reminder_logs').insert({ rule_id: rule.id, response: 'Sent via Messenger' })
  } catch (error) {
    console.error('Messenger error:', error)
  }
}

async function sendTelegramReminder(rule: any, talk: any, supabase: any) {
  console.log('Processing telegram for talk:', talk.speaker_name)

  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('Missing TELEGRAM_BOT_TOKEN')
    return
  }

  const tz = process.env.NEXT_PUBLIC_TIMEZONE || 'Asia/Manila'
  const talkDate = new Date(talk.talk_date)
  const formattedDate = talkDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: tz })
  const formattedTime = talkDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone: tz })

  const messageText = `⏰ Reminder: ${talk.talk_title || 'Your Talk'} is Coming Up\n\nHi ${talk.speaker_name},\n\nThis is a friendly reminder about your upcoming talk:\n"${talk.talk_title || 'Talk'}"\n\n📅 Date: ${formattedDate}\n🕐 Time: ${formattedTime}\n⏱ Reminder: ${rule.offset_label}\n\nWe're looking forward to your presentation! (Sent via Talk Reminder by Ortuma)`

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: talk.telegram_chat_id,
        text: messageText
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Telegram Send API error:', JSON.stringify(errorData))
      return
    }

    console.log('Telegram message sent to:', talk.speaker_name)
    await supabase.from('reminder_rules').update({ is_sent: true }).eq('id', rule.id)
    await supabase.from('reminder_logs').insert({ rule_id: rule.id, response: 'Sent via Telegram' })
  } catch (error) {
    console.error('Telegram error:', error)
  }
}

export async function GET() {
  return POST()
}