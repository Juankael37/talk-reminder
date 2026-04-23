import { NextResponse } from 'next/server'

export async function GET() {
  const pageToken = process.env.MESSENGER_PAGE_ACCESS_TOKEN
  
  // Get messages from the conversation
  const msgRes = await fetch(
    `https://graph.facebook.com/v21.0/t_26439781818997032/messages?access_token=${pageToken}&limit=5`
  )
  const msgData = await msgRes.json()
  
  return NextResponse.json(msgData)
}