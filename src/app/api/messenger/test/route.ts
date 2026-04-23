import { NextResponse } from 'next/server'

export async function GET() {
  const pageAccessToken = process.env.MESSENGER_PAGE_ACCESS_TOKEN
  
  // First get page info
  const meRes = await fetch(
    `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${pageAccessToken}`
  )
  const meData = await meRes.json()
  
  // Get conversations
  const convRes = await fetch(
    `https://graph.facebook.com/v21.0/me/conversations?access_token=${pageAccessToken}&limit=5`
  )
  const convData = await convRes.json()
  
  return NextResponse.json({
    page: meData,
    conversations: convData.data?.slice(0, 2) || []
  })
}