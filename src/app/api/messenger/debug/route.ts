import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const verifyToken = process.env.MESSENGER_VERIFY_TOKEN || 'NOT_SET'
  const pageToken = process.env.MESSENGER_PAGE_ACCESS_TOKEN
  const appSecret = process.env.MESSENGER_APP_SECRET
  
  return NextResponse.json({
    verifyToken,
    verifyTokenLength: verifyToken.length,
    hasPageToken: !!pageToken,
    hasAppSecret: !!appSecret,
  })
}