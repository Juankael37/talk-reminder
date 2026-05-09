import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN
const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED')
      return new NextResponse(challenge, { status: 200 })
    } else {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  return new NextResponse('Bad Request', { status: 400 })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (body.object === 'page') {
      for (const entry of body.entry) {
        const webhook_event = entry.messaging?.[0]
        if (!webhook_event) continue

        const sender_psid = webhook_event.sender.id

        if (webhook_event.message && webhook_event.message.text) {
          await handleMessage(sender_psid, webhook_event.message.text)
        }
      }
      return new NextResponse('EVENT_RECEIVED', { status: 200 })
    } else {
      return new NextResponse('Not Found', { status: 404 })
    }
  } catch (error) {
    console.error('Webhook POST Error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

async function handleMessage(sender_psid: string, received_message: string) {
  const email = received_message.trim().toLowerCase()

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase credentials')
    return
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Try to find a talk with this email (case-insensitive)
  const { data: talks, error } = await supabase
    .from('talks')
    .select('*')
    .ilike('speaker_email', email)
    .eq('notification_channel', 'messenger')

  if (error) {
    console.error('Supabase search error:', error)
    await sendMessage(sender_psid, 'Sorry, an internal error occurred while processing your request. Please try again later.')
    return
  }

  if (talks && talks.length > 0) {
    // Update the talks with the PSID
    const talkIds = talks.map(t => t.id)
    const { error: updateError } = await supabase
      .from('talks')
      .update({ messenger_psid: sender_psid, messenger_opted_in: true })
      .in('id', talkIds)

    if (updateError) {
      console.error('Supabase update error:', updateError)
      await sendMessage(sender_psid, 'Sorry, an error occurred while saving your opt-in. Please try again later.')
      return
    }

    const talkTitles = talks.map(t => t.talk_title || 'your talk').join(' & ')
    await sendMessage(sender_psid, `Successfully opted in for reminders for: ${talkTitles}! 🎉 We will message you here when your reminders are due.`)
  } else {
    // No match found
    await sendMessage(sender_psid, `Sorry, we couldn't find a scheduled talk for the email address "${email}". Please check for typos and try sending it again.`)
  }
}

async function sendMessage(sender_psid: string, text: string) {
  if (!PAGE_ACCESS_TOKEN) {
    console.error('Missing PAGE_ACCESS_TOKEN')
    return
  }

  const requestBody = {
    recipient: {
      id: sender_psid
    },
    message: {
      text: text
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
    }
  } catch (error) {
    console.error('Error sending message:', error)
  }
}
