import { NextResponse } from 'next/server'

export async function GET() {
  const pageToken = process.env.MESSENGER_PAGE_ACCESS_TOKEN
  
  // Get the first conversation
  const convRes = await fetch(
    `https://graph.facebook.com/v21.0/me/conversations?access_token=${pageToken}&limit=1`
  )
  const convData = await convRes.json()
  const conv = convData.data?.[0]
  
  if (!conv) {
    return NextResponse.json({ error: 'No conversations' })
  }
  
  // Get messages in the conversation
  const msgRes = await fetch(
    `https://graph.facebook.com/v21.0/${conv.id}/messages?access_token=${pageToken}&limit=3`
  )
  const msgData = await msgRes.json()
  
  return NextResponse.json({
    conversation: conv,
    messages: msgData.data
  })
}