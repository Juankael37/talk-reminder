import { NextResponse } from 'next/server'

export async function POST() {
  const testPayload = {
    object: 'page',
    entry: [{
      id: '0',
      messaging: [{
        sender: { id: 'test-user-123' },
        message: { text: 'subscribe' }
      }]
    }]
  }

  return NextResponse.json({ received: true, payload: testPayload })
}