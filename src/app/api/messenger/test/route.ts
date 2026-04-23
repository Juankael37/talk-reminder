import { NextResponse } from 'next/server'

export async function GET() {
  const pageToken = process.env.MESSENGER_PAGE_ACCESS_TOKEN
  const userId = '24916097874755053' // John's PSID
  
  // Try to send message to this user
  const response = await fetch(
    `https://graph.facebook.com/v21.0/me/messages?access_token=${pageToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: userId },
        message: { text: 'Hello from Mate Reminder test!' }
      })
    }
  )
  
  const result = await response.json()
  return NextResponse.json(result)
}