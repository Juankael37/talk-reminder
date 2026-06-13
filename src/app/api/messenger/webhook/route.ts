import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireEnv, getOptionalEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
import {
  verifyMetaSignature,
  clampText,
  normalizeEmail,
} from '@/lib/webhook-security'
import {
  methodNotAllowed,
  applyRateLimit,
  genericError,
} from '@/lib/api-guard'

export const dynamic = 'force-dynamic'

type MessengerEntry = {
  messaging?: Array<{
    sender?: { id?: string }
    message?: { text?: string }
  }>
}

type MessengerBody = {
  object?: string
  entry?: MessengerEntry[]
}

const getVerifyToken = () => process.env.MESSENGER_VERIFY_TOKEN
const getPageAccessToken = () => process.env.MESSENGER_PAGE_ACCESS_TOKEN
const getAppSecret = () => getOptionalEnv('MESSENGER_APP_SECRET')

export async function GET(request: Request) {
  const rl = applyRateLimit(request, 'messenger-webhook-get', { limit: 10, windowMs: 60_000 })
  if (!rl.allowed) return rl.response!

  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode && token) {
    if (mode === 'subscribe' && token === getVerifyToken()) {
      logger.info('messenger.webhook_verified')
      return new NextResponse(challenge ?? '', { status: 200 })
    }
    return new NextResponse('Forbidden', { status: 403 })
  }

  return new NextResponse('Bad Request', { status: 400 })
}

export async function POST(request: Request) {
  const rl = applyRateLimit(request, 'messenger-webhook-post', { limit: 60, windowMs: 60_000 })
  if (!rl.allowed) return rl.response!

  const appSecret = getAppSecret()
  if (!appSecret) {
    logger.error('messenger.app_secret_missing')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const rawBody = await request.text()
  const sigHeader = request.headers.get('x-hub-signature-256')

  if (!verifyMetaSignature(rawBody, sigHeader, appSecret)) {
    logger.warn('messenger.signature_invalid')
    return new NextResponse('Forbidden', { status: 403 })
  }

  let body: MessengerBody
  try {
    body = JSON.parse(rawBody) as MessengerBody
  } catch {
    return new NextResponse('Bad Request', { status: 400 })
  }

  if (body?.object !== 'page') {
    return new NextResponse('Not Found', { status: 404 })
  }

  try {
    for (const entry of body.entry ?? []) {
      const webhook_event = entry.messaging?.[0]
      if (!webhook_event) continue

      const sender_psid = webhook_event.sender?.id
      if (typeof sender_psid !== 'string' || !sender_psid) continue

      const text = clampText(webhook_event.message?.text, 320)
      if (text) {
        await handleMessage(sender_psid, text)
      }
    }
    return new NextResponse('EVENT_RECEIVED', { status: 200 })
  } catch (error) {
    return genericError('messenger-webhook', error)
  }
}

async function handleMessage(sender_psid: string, received_message: string) {
  const email = normalizeEmail(received_message)
  if (!email) {
    await sendMessage(sender_psid, 'Please send a valid email address to opt in for reminders.')
    return
  }

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: talks, error } = await supabase
    .from('talks')
    .select('id, talk_title')
    .ilike('speaker_email', email)
    .eq('notification_channel', 'messenger')
    .limit(5)

  if (error) {
    logger.error('messenger.search_failed', { message: error.message })
    await sendMessage(sender_psid, 'Sorry, an internal error occurred while processing your request. Please try again later.')
    return
  }

  if (talks && talks.length > 0) {
    const talkIds = talks.map((t: { id: string }) => t.id)
    const { error: updateError } = await supabase
      .from('talks')
      .update({ messenger_psid: sender_psid, messenger_opted_in: true })
      .in('id', talkIds)

    if (updateError) {
      logger.error('messenger.update_failed', { message: updateError.message })
      await sendMessage(sender_psid, 'Sorry, an error occurred while saving your opt-in. Please try again later.')
      return
    }

    const talkTitles = talks.map((t: { talk_title: string | null }) => t.talk_title || 'your talk').join(' & ')
    await sendMessage(sender_psid, `Successfully opted in for reminders for: ${talkTitles}! 🎉 We will message you here when your reminders are due.`)
  } else {
    await sendMessage(sender_psid, `Sorry, we couldn't find a scheduled talk for that email address. Please check for typos and try sending it again.`)
  }
}

async function sendMessage(sender_psid: string, text: string) {
  const pageAccessToken = getPageAccessToken()
  if (!pageAccessToken) {
    logger.error('messenger.token_missing')
    return
  }

  const requestBody = {
    messaging_type: 'RESPONSE',
    recipient: { id: sender_psid },
    message: { text: text.slice(0, 2000) },
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      logger.error('messenger.send_api_error', { status: response.status })
    }
  } catch (error) {
    logger.error('messenger.send_failed', { message: error instanceof Error ? error.message : 'unknown' })
  }
}

export async function PUT() {
  return methodNotAllowed(['GET', 'POST'])
}

export async function DELETE() {
  return methodNotAllowed(['GET', 'POST'])
}
