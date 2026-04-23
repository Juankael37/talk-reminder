import { NextResponse } from 'next/server'

export async function GET() {
  const pageToken = process.env.MESSENGER_PAGE_ACCESS_TOKEN
  
  // Get page info
  const response = await fetch(
    `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${pageToken}`
  )
  
  const result = await response.json()
  return NextResponse.json(result)
}