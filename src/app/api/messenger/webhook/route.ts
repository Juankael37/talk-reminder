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
    
    // Log what we received
    console.log('WEBHOOK RECEIVED:', JSON.stringify(data).substring(0, 500))
    
    // Check if it's a message
    if (data.object === 'page' && data.entry && data.entry[0]) {
      const entry = data.entry[0]
      const messaging = entry.messaging?.[0]
      const standby = entry.standby?.[0]
      const msg = messaging || standby
      
      if (msg && msg.message) {
        const psid = msg.sender?.id
        const text = msg.message?.text
        
        console.log('MESSAGE PSID:', psid, 'TEXT:', text)
        
        // ALWAYS respond - just to test webhook is being called
        await sendMessage(psid, "Got your message: " + text)
        
        console.log('RESPONSE SENT to:', psid)
      }
    }

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('WEBHOOK ERROR:', error)
    return new NextResponse('Error', { status: 500 })
  }
}

async function sendMessage(psid: string, messageText: string) {
  const pageAccessToken = process.env.MESSENGER_PAGE_ACCESS_TOKEN
  if (!pageAccessToken) {
    console.log('NO TOKEN')
    return
  }

  try {
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
    console.log('SEND RESULT:', result)
    return result
  } catch (e) {
    console.error('SEND ERROR:', e)
  }
}