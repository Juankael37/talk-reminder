import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireEnv, getOptionalEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
import {
  verifyTelegramSecret,
  clampText,
  normalizeEmail,
} from '@/lib/webhook-security'
import { applyRateLimit, methodNotAllowed } from '@/lib/api-guard'

export const dynamic = 'force-dynamic'

type TelegramUpdate = {
  message?: {
    chat?: { id?: number | string }
    text?: string
  }
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WEBHOOK_SECRET = getOptionalEnv('TELEGRAM_WEBHOOK_SECRET')

export async function POST(request: Request) {
  const rl = applyRateLimit(request, 'telegram-webhook', { limit: 60, windowMs: 60_000 })
  if (!rl.allowed) return rl.response!

  if (!WEBHOOK_SECRET) {
    logger.error('telegram.webhook_secret_missing')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const provided = request.headers.get('x-telegram-bot-api-secret-token')
  if (!verifyTelegramSecret(provided, WEBHOOK_SECRET)) {
    logger.warn('telegram.secret_invalid')
    return new NextResponse('Forbidden', { status: 403 })
  }

  let body: TelegramUpdate
  try {
    body = (await request.json()) as TelegramUpdate
  } catch {
    return new NextResponse('Bad Request', { status: 400 })
  }

  if (body?.message?.text) {
    const chatId = body.message.chat?.id
    if (chatId == null) return new NextResponse('OK', { status: 200 })
    const text = clampText(body.message.text, 320)
    if (text) {
      await handleMessage(chatId, text)
    }
  }

  return new NextResponse('OK', { status: 200 })
}

async function handleMessage(chatId: number | string, received_message: string) {
  const lower = received_message.trim().toLowerCase()
  if (lower.startsWith('/start') || lower.startsWith('/help')) {
    await sendMessage(chatId, 'Welcome to Talk Reminder! Please send your email address to opt-in for reminders.')
    return
  }

  const email = normalizeEmail(received_message)
  if (!email) {
    await sendMessage(chatId, 'Please send a valid email address to opt in for reminders.')
    return
  }

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: talks, error } = await supabase
    .from('talks')
    .select('id, talk_title')
    .ilike('speaker_email', email)
    .eq('notification_channel', 'telegram')
    .limit(5)

  if (error) {
    logger.error('telegram.search_failed', { message: error.message })
    await sendMessage(chatId, 'Sorry, an internal error occurred while processing your request. Please try again later.')
    return
  }

  if (talks && talks.length > 0) {
    const talkIds = talks.map((t: { id: string }) => t.id)
    const { error: updateError } = await supabase
      .from('talks')
      .update({ telegram_chat_id: String(chatId), telegram_opted_in: true })
      .in('id', talkIds)

    if (updateError) {
      logger.error('telegram.update_failed', { message: updateError.message })
      await sendMessage(chatId, 'Sorry, an error occurred while saving your opt-in. Please try again later.')
      return
    }

    const talkTitles = talks.map((t: { talk_title: string | null }) => t.talk_title || 'your talk').join(' & ')
    await sendMessage(chatId, `Successfully opted in for reminders for: ${talkTitles}! 🎉 We will message you here when your reminders are due.`)
  } else {
    await sendMessage(chatId, `Sorry, we couldn't find a scheduled talk for that email address that uses Telegram for notifications. Please check for typos and try sending it again.`)
  }
}

async function sendMessage(chatId: number | string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    logger.error('telegram.token_missing')
    return
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.slice(0, 4000),
      }),
    })

    if (!response.ok) {
      logger.error('telegram.send_api_error', { status: response.status })
    }
  } catch (error) {
    logger.error('telegram.send_failed', { message: error instanceof Error ? error.message : 'unknown' })
  }
}

export async function GET() {
  return methodNotAllowed(['POST'])
}
