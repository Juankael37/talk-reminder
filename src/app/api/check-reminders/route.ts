import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

export const dynamic = 'force-static'

const getTransporter = () => {
  const email = process.env.EMAIL_USER
  const password = process.env.EMAIL_PASS

  if (!email || !password) {
    return null
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: email,
      pass: password,
    },
  })
}

export async function POST() {
  try {
    const supabase = await createClient()

    const now = new Date().toISOString()

    const { data: dueRules, error: rulesError } = await supabase
      .from('reminder_rules')
      .select('*, talks(*)')
      .eq('is_sent', false)
      .lte('scheduled_time', now)

    if (rulesError) {
      console.error('Error fetching rules:', rulesError)
      return NextResponse.json({ error: rulesError.message }, { status: 500 })
    }

    if (!dueRules || dueRules.length === 0) {
      return NextResponse.json({ message: 'No reminders due', sent: 0 })
    }

    const transporter = getTransporter()
    let sentCount = 0

    for (const rule of dueRules) {
      const talk = rule.talks
      if (!talk || !talk.phone_number) continue

      const message = `Reminder: ${talk.speaker_name}${talk.talk_title ? ` - "${talk.talk_title}"` : ''} is scheduled in ${rule.offset_label}.`

      try {
        if (transporter) {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: talk.phone_number,
            subject: `Talk Reminder: ${talk.speaker_name}`,
            text: message,
          })
        }

        await supabase
          .from('reminder_rules')
          .update({ is_sent: true })
          .eq('id', rule.id)

        await supabase
          .from('reminder_logs')
          .insert({
            rule_id: rule.id,
            response: transporter ? 'Sent via Email' : 'Skipped (no email config)',
          })

        sentCount++
      } catch (emailError) {
        console.error('Email error:', emailError)

        await supabase
          .from('reminder_logs')
          .insert({
            rule_id: rule.id,
            response: emailError instanceof Error ? emailError.message : 'Error',
          })
      }
    }

    return NextResponse.json({ message: 'Done', sent: sentCount })
  } catch (error) {
    console.error('Error in check-reminders:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return POST()
}