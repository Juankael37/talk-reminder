import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (body.message && body.message.text) {
      const chatId = body.message.chat.id
      const text = body.message.text

      await handleMessage(chatId, text)
    }

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Telegram Webhook POST Error:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

async function handleMessage(chatId: number | string, received_message: string) {
  const email = received_message.trim().toLowerCase()

  // Ignore start commands or general chatter
  if (email.startsWith('/start') || email.startsWith('/help')) {
    await sendMessage(chatId, 'Welcome to Talk Reminder! Please send your email address to opt-in for reminders.')
    return
  }

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
    .eq('notification_channel', 'telegram')

  if (error) {
    console.error('Supabase search error:', error)
    await sendMessage(chatId, 'Sorry, an internal error occurred while processing your request. Please try again later.')
    return
  }

  if (talks && talks.length > 0) {
    // Update the talks with the Telegram chat ID
    const talkIds = talks.map(t => t.id)
    const { error: updateError } = await supabase
      .from('talks')
      .update({ telegram_chat_id: String(chatId), telegram_opted_in: true })
      .in('id', talkIds)

    if (updateError) {
      console.error('Supabase update error:', updateError)
      await sendMessage(chatId, 'Sorry, an error occurred while saving your opt-in. Please try again later.')
      return
    }

    const talkTitles = talks.map(t => t.talk_title || 'your talk').join(' & ')
    await sendMessage(chatId, `Successfully opted in for reminders for: ${talkTitles}! 🎉 We will message you here when your reminders are due.`)
  } else {
    // No match found
    await sendMessage(chatId, `Sorry, we couldn't find a scheduled talk for the email address "${email}" that uses Telegram for notifications. Please check for typos and try sending it again.`)
  }
}

async function sendMessage(chatId: number | string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('Missing TELEGRAM_BOT_TOKEN')
    return
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Telegram Send API error:', JSON.stringify(errorData))
    }
  } catch (error) {
    console.error('Error sending message:', error)
  }
}
