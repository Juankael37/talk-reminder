import { NextResponse } from 'next/server'

export async function GET() {
  const pageToken = process.env.MESSENGER_PAGE_ACCESS_TOKEN
  
  // Get conversations with participants
  const convRes = await fetch(
    `https://graph.facebook.com/v21.0/me/conversations?access_token=${pageToken}&limit=1&fields=participants,message_count`
  )
  const convData = await convRes.json()
  
  return NextResponse.json(convData)
}