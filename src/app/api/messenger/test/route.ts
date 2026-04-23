import { NextResponse } from 'next/server'

export async function GET() {
  const pageToken = process.env.MESSENGER_PAGE_ACCESS_TOKEN
  
  // Try sending a message - this will fail but shows the exact error
  const testResponse = await fetch(
    `https://graph.facebook.com/v21.0/me/messages?access_token=${pageToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: '0' }, // This won't work but shows error
        message: { text: 'test' }
      })
    }
  )
  
  const result = await testResponse.json()
  return NextResponse.json(result)
}