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
    
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ 
        error: 'Missing environment variables',
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!serviceKey
      }, { status: 500 })
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

      const message = `Reminder: ${talk.speaker_name}${talk.talk_title ? ` - "${talk.talk_title}"` : ''} is scheduled in ${rule.offset_label}.`

      try {
        if (transporter) {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: talk.speaker_email,
            subject: `Talk Reminder: ${talk.speaker_name}`,
            text: message,
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