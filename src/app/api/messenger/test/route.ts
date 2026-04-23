import { NextResponse } from 'next/server'

export async function POST() {
  const pageToken = process.env.MESSENGER_PAGE_ACCESS_TOKEN
  
  const response = await fetch(
    `https://graph.facebook.com/v21.0/me/messages?access_token=${pageToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: 'test-user-123' },
        message: { text: 'Hello from Mate Reminder!' },
      }),
    }
  )

  const result = await response.json()
  return NextResponse.json(result)
}

export async function GET() {
  return POST()
}