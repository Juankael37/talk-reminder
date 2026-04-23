import { NextResponse } from 'next/server'

export async function GET() {
  const pageToken = process.env.MESSENGER_PAGE_ACCESS_TOKEN
  
  // Check current permissions
  const permRes = await fetch(
    `https://graph.facebook.com/v21.0/me/permissions?access_token=${pageToken}`
  )
  const perms = await permRes.json()
  
  return NextResponse.json(perms)
}