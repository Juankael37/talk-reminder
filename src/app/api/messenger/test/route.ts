import { NextResponse } from 'next/server'

export async function GET() {
  // Simulate a webhook call
  const mockData = {
    object: 'page',
    entry: [{
      messaging: [{
        sender: { id: '24916097874755053' },
        message: { text: 'test message' }
      }]
    }]
  }
  
  // Call the webhook ourselves
  const response = await fetch('https://talk-reminder.vercel.app/api/messenger/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mockData)
  })
  
  const result = await response.text()
  return NextResponse.json({ webhookResponse: result, status: response.status })
}