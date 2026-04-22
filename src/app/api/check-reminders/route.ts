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
    .messenger-section { background: linear-gradient(135deg, #f0f4ff, #e8eeff); border-radius: 12px; padding: 24px; margin-top: 28px; text-align: center; }
    .messenger-section h3 { margin: 0 0 12px 0; color: #1E293B; font-size: 16px; font-weight: 600; }
    .messenger-section p { margin: 0 0 16px 0; color: #64748B; font-size: 14px; line-height: 1.5; }
    .messenger-btn { display: inline-block; background: linear-gradient(135deg, #0080FF, #0066CC); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; }
    .messenger-btn:hover { background: linear-gradient(135deg, #0070ee, #0055bb); }
    .footer { background-color: #F1F5F9; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
    .footer a { color: #6366F1; text-decoration: none; }
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
      
      <div class="messenger-section">
        <h3>💬 Prefer Messenger Reminders?</h3>
        <p>Get future reminders delivered directly to your Facebook Messenger. Click below to subscribe — it's quick and easy!</p>
        <a href="https://m.me/matereminder?text=subscribe" class="messenger-btn">Subscribe via Messenger</a>
        <p style="margin-top: 12px; font-size: 12px; color: #94a3b8;">Click the button → Opens Messenger → Send "subscribe" to confirm</p>
      </div>
    </div>
    <div class="footer">
      <p>Sent via <a href="#">Mate Reminder</a></p>
    </div>
  </div>
</body>
</html>`

      const plainText = `Hi ${talk.speaker_name},\n\nThis is a friendly reminder about your upcoming talk:\n\n"${talk.talk_title || 'Talk'}"\n\nDate: ${formattedDate}\nTime: ${formattedTime}\n\nWe're looking forward to your presentation!\n\n---\n💬 Prefer Messenger Reminders?\nGet future reminders via Facebook Messenger:\nhttps://m.me/matereminder?text=subscribe\n\n- Sent via Mate Reminder`

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