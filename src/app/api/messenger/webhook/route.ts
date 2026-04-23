import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.MESSENGER_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Verification failed', { status: 403 })
}

export async function POST(request: Request) {
  // Return OK immediately 
  const response = new NextResponse('OK', { status: 200 })
  
  // Process in background
  request.text().then(async (bodyText) => {
    try {
      const data = JSON.parse(bodyText)
      console.log('Webhook:', JSON.stringify(data).substring(0, 200))
      
      if (data.object === 'page' && data.entry?.[0]) {
        const msg = data.entry[0].messaging?.[0] || data.entry[0].standby?.[0]
        if (msg?.message?.text) {
          const psid = msg.sender?.id
          const text = msg.message.text
          console.log('From PSID:', psid, 'Text:', text)
          await sendMessage(psid, "Echo: " + text)
        }
      }
    } catch (e) {
      console.error('Error:', e)
    }
  }).catch(e => console.error('Parse error:', e))
  
  return response
}

async function sendMessage(psid: string, messageText: string) {
  const token = process.env.MESSENGER_PAGE_ACCESS_TOKEN
  if (!token) return
  
  fetch(
    `https://graph.facebook.com/v21.0/me/messages?access_token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: psid },
        message: { text: messageText },
      }),
    }
  ).then(r => r.json()).then(r => console.log('Sent:', r)).catch(e => console.error('Send error:', e))
}