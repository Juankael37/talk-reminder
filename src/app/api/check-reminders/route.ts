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
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl) {
      return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 })
    }
    if (!serviceKey) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY - add it in Vercel Dashboard > Settings > Environment Variables' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    const now = new Date().toISOString()
    console.log('Checking for reminders at', now)

    const { data: dueRules, error: rulesError } = await supabase
      .from('reminder_rules')
      .select('*, talks(*)')
      .eq('is_sent', false)
      .lte('scheduled_time', now)

    console.log('Rules query result:', { count: dueRules?.length, error: rulesError })

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
      if (!talk?.speaker_email) {
        console.log('Skipping rule - no speaker email:', rule.id)
        continue
      }

      console.log('Processing rule for talk:', talk.speaker_name, '->', talk.speaker_email)

      const talkDate = new Date(talk.talk_date)
      const formattedDate = talkDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      const formattedTime = talkDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #6366F1, #4F46E5); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .header p { margin: 8px 0 0 0; opacity: 0.9; font-size: 14px; }
    .content { padding: 30px; }
    .greeting { font-size: 18px; color: #1E293B; margin-bottom: 20px; }
    .talk-card { background-color: #F8FAFC; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #6366F1; }
    .talk-title { font-size: 20px; font-weight: 600; color: #1E293B; margin: 0 0 15px 0; }
    .details { margin: 0; padding: 0; list-style: none; }
    .details li { margin: 10px 0; color: #64748B; font-size: 14px; }
    .details li strong { color: #1E293B; }
    .icon { margin-right: 8px; }
    .footer { background-color: #F1F5F9; padding: 20px; text-align: center; font-size: 12px; color: #64748B; }
    .footer a { color: #6366F1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Reminder</h1>
      <p>Your talk is coming up!</p>
    </div>
    <div class="content">
      <p class="greeting">Hi ${talk.speaker_name},</p>
      <p>This is a friendly reminder about your upcoming talk:</p>
      <div class="talk-card">
        <h3 class="talk-title">📣 ${talk.talk_title || 'Talk'}</h3>
        <ul class="details">
          <li><span class="icon">📅</span><strong>Date:</strong> ${formattedDate}</li>
          <li><span class="icon">🕐</span><strong>Time:</strong> ${formattedTime}</li>
          <li><span class="icon">⏱</span><strong>Reminder:</strong> ${rule.offset_label}</li>
        </ul>
      </div>
      <p>We're looking forward to your presentation!</p>
    </div>
    <div class="footer">
      <p>Sent via <a href="#">Talk Reminder</a></p>
    </div>
  </div>
</body>
</html>`

      const plainText = `Hi ${talk.speaker_name},\n\nThis is a friendly reminder about your upcoming talk:\n\n"${talk.talk_title || 'Talk'}"\n\nDate: ${formattedDate}\nTime: ${formattedTime}\n\nWe're looking forward to your presentation!\n\n- Sent via Talk Reminder`

      try {
        if (transporter) {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: talk.speaker_email,
            subject: `Reminder: ${talk.talk_title || 'Your Talk'} is Coming Up`,
            html: htmlContent,
            text: plainText,
          })
          console.log('Email sent to:', talk.speaker_email)
        }

        await supabase
          .from('reminder_rules')
          .update({ is_sent: true })
          .eq('id', rule.id)

        await supabase.from('reminder_logs').insert({
          rule_id: rule.id,
          response: 'Sent via Email',
        })

        sentCount++
      } catch (emailError) {
        console.error('Email error:', emailError)
      }
    }

    return NextResponse.json({ message: 'Done', sent: sentCount })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return POST()
}