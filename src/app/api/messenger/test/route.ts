import { NextResponse } from 'next/server'

export async function GET() {
  const pageToken = process.env.MESSENGER_PAGE_ACCESS_TOKEN
  
  // Get conversations with message info
  const convRes = await fetch(
    `https://graph.facebook.com/v21.0/me/conversations?access_token=${pageToken}&limit=1&fields=participants,updated_time`
  )
  const convData = await convRes.json()
  
  const conv = convData.data?.[0]
  if (!conv) {
    return NextResponse.json({ no_conversation: true })
  }
  
  // Get the user PSID from participants
  const participants = convData.data?.[0]?.participants?.data || []
  
  return NextResponse.json({
    conversation_id: conv?.id,
    participants: participants,
    raw: convData.data
  })
}