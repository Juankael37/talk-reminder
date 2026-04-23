import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const verifyToken = process.env.MESSENGER_VERIFY_TOKEN || 'NOT_SET'
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Verification failed', { status: 403 })
}

export async function POST(request: Request) {
  try {
    const bodyText = await request.text()
    const data = JSON.parse(bodyText)
    
    console.log('Webhook received:', Object.keys(data))

    if (data.object === 'page') {
      for (const entry of data.entry || []) {
        // Regular messaging
        for (const msg of entry.messaging || []) {
          if (msg.message?.text) {
            const psid = msg.sender?.id
            const text = msg.message.text
            console.log('Message from PSID:', psid, 'Text:', text)
            await processMessage(psid, text)
          }
        }
        // Standby (handles messages when page is in use)
        for (const msg of entry.standby || []) {
          if (msg.message?.text) {
            const psid = msg.sender?.id
            const text = msg.message.text
            console.log('Standby from PSID:', psid, 'Text:', text)
            await processMessage(psid, text)
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

async function processMessage(psid: string, text: string) {
  if (!psid || !text) return
  
  if (text.toLowerCase() === 'subscribe') {
    await sendMessage(psid, "You're now subscribed to Messenger reminders!")
  } else if (text.toLowerCase() === 'stop') {
    await sendMessage(psid, "You've unsubscribed.")
  } else {
    await sendMessage(psid, "Thanks! Send 'subscribe' or 'stop'.")
  }
}

async function sendMessage(psid: string, messageText: string) {
  const pageAccessToken = process.env.MESSENGER_PAGE_ACCESS_TOKEN
  if (!pageAccessToken) {
    console.log('No page access token')
    return
  }

  console.log('Sending to PSID:', psid)

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
  console.log('Send result:', result)
  return result
}