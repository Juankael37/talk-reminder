import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    verifyToken: process.env.MESSENGER_VERIFY_TOKEN,
    hasPageToken: !!process.env.MESSENGER_PAGE_ACCESS_TOKEN,
    hasAppSecret: !!process.env.MESSENGER_APP_SECRET,
  })
}