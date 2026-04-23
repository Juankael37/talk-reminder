import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN
const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN
const APP_SECRET = process.env.MESSENGER_APP_SECRET

export async function GET() {
  return NextResponse.json({
    verifyToken: VERIFY_TOKEN,
    verifyTokenLength: VERIFY_TOKEN?.length,
    hasPageToken: !!PAGE_ACCESS_TOKEN,
    hasAppSecret: !!APP_SECRET,
  })
}