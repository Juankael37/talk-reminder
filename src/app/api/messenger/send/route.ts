import { NextResponse } from 'next/server'

const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Missing config' }, { status: 500 })
    }

    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    const now = new Date().toISOString()

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

    let sentCount = 0

    for (const rule of dueRules) {
      const talk = (rule as any).talks

      if (!talk?.messenger_psid || !talk.messenger_opted_in) {
        console.log('Skipping rule - no Messenger opt-in:', rule.id)
        continue
      }

      console.log('Sending Messenger reminder for talk:', talk.speaker_name)

      const talkDate = new Date(talk.talk_date)
      const formattedDate = talkDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      const formattedTime = talkDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      })

      const message = `⏰ Reminder: Your talk "${talk.talk_title || 'Talk'}" is coming up!\n\n📅 ${formattedDate}\n🕐 ${formattedTime}\n⏱ ${rule.offset_label}`

      const result = await sendMessengerMessage(talk.messenger_psid, message)

      if (result?.message_id) {
        await supabase
          .from('reminder_rules')
          .update({ is_sent: true })
          .eq('id', rule.id)

        await supabase.from('reminder_logs').insert({
          rule_id: rule.id,
          response: 'Sent via Messenger',
        })

        sentCount++
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

async function sendMessengerMessage(psid: string, messageText: string) {
  if (!PAGE_ACCESS_TOKEN) {
    console.log('No page access token')
    return null
  }

  const response = await fetch(
    `https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: psid },
        message: { text: messageText },
      }),
    }
  )

  return response.json()
}