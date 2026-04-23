import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const token = process.env.MESSENGER_VERIFY_TOKEN || 'NOT_SET'
  return NextResponse.json({ 
    token,
    tokenLength: token.length,
    expected: 'mate-reminder-2026',
    expectedLength: 'mate-reminder-2026'.length
  })
}