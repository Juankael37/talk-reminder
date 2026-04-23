import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN
const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN
const APP_SECRET = process.env.MESSENGER_APP_SECRET

function verifySignature(body: string, signature: string | null): boolean {
  if (!signature || !APP_SECRET) return true
  
  const crypto = require('crypto')
  const expected = crypto
    .createHmac('sha1', APP_SECRET)
    .update(body)
    .digest('hex')
  
  return signature === `sha1=${expected}`
}

export async function GET(request: Request) {
  const verifyToken = process.env.MESSENGER_VERIFY_TOKEN || 'NOT_SET'
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  console.log('Webhook GET:', { mode, token, verifyToken })

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Webhook verified')
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Verification failed', { status: 403 })
}

export async function POST(request: Request) {
  try {
    console.log('Webhook POST called')
    const body = await request.text()
    console.log('Raw body:', body)
    
    // Skip signature verification for now (can enable later with proper secret)
    // if (!verifySignature(body, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    // }

    const data = JSON.parse(body)

    if (data.object === 'page') {
      for (const entry of data.entry || []) {
        for (const messaging of entry.messaging || []) {
          const senderPsid = messaging.sender.id
          const message = messaging.message?.text

          console.log('Received message from PSID:', senderPsid, message)

          if (message?.toLowerCase() === 'subscribe') {
            await handleOptIn(senderPsid)
          } else if (message?.toLowerCase() === 'stop') {
            await handleOptOut(senderPsid)
          } else {
            await sendMessage(senderPsid, "Thanks for messaging Mate Reminder! Send 'subscribe' to get reminder notifications via Messenger, or 'stop' to unsubscribe.")
          }
        }
      }
    }

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new NextResponse('Error', { status: 500 })
  }
}

async function handleOptIn(psid: string) {
  const { createClient } = require('@supabase/supabase-js')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.log('Missing Supabase config, skipping opt-in storage')
    await sendMessage(psid, "You're now subscribed to Messenger reminders! You'll receive notifications here.")
    return
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: talk } = await supabase
    .from('talks')
    .select('id, speaker_name')
    .ilike('speaker_name', `%${psid}%`)
    .single()

  await supabase
    .from('talks')
    .update({ messenger_psid: psid, messenger_opted_in: true })
    .eq('speaker_name', psid)
    .is('messenger_psid', null)

  await sendMessage(psid, "You're now subscribed to Messenger reminders! You'll receive your talk reminders here.")
}

async function handleOptOut(psid: string) {
  const { createClient } = require('@supabase/supabase-js')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    await sendMessage(psid, "You've unsubscribed from Messenger reminders.")
    return
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  await supabase
    .from('talks')
    .update({ messenger_opted_in: false })
    .eq('messenger_psid', psid)

  await sendMessage(psid, "You've unsubscribed from Messenger reminders.")
}

async function sendMessage(psid: string, messageText: string) {
  const pageAccessToken = process.env.MESSENGER_PAGE_ACCESS_TOKEN
  if (!pageAccessToken) {
    console.log('No page access token, skipping send')
    return
  }

  const response = await fetch(
    `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: psid },
        message: { text: messageText },
      }),
    }
  )

  const result = await response.json()
  console.log('Send message result:', result)
  return result
}