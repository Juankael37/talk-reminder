import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const pageToken = process.env.MESSENGER_PAGE_ACCESS_TOKEN || 'MISSING'
  
  const convRes = await fetch(
    `https://graph.facebook.com/v21.0/me/conversations?access_token=${pageToken}&limit=1`,
    { cache: 'no-store' }
  )
  const convData = await convRes.json()
  
  return NextResponse.json(convData)
}