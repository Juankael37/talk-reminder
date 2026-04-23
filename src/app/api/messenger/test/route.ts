import { NextResponse } from 'next/server'

export async function GET() {
  const pageToken = process.env.MESSENGER_PAGE_ACCESS_TOKEN
  
  // Use the Server API to get new messages since webhook may not be working
  const response = await fetch(
    `https://graph.facebook.com/v21.0/me/conversations?access_token=${pageToken}&limit=1&fields=participants,updated_time,messages{message,from}`
  )
  const data = await response.json()
  
  if (data.data && data.data[0] && data.data[0].messages) {
    const messages = data.data[0].messages.data
    // Get the most recent message
    const latest = messages[messages.length - 1]
    
    // If it's from the user (not the page), reply
    if (latest && latest.from && latest.from.id !== '1035715706299815') {
      const userMsg = latest.message
      const userId = latest.from.id
      
      console.log('Got message:', userMsg, 'from:', userId)
      
      // Reply
      await sendMessage(pageToken, userId, "Got: " + userMsg)
    }
  }
  
  return NextResponse.json(data)
}

async function sendMessage(token: string, userId: string, text: string) {
  await fetch(
    `https://graph.facebook.com/v21.0/me/messages?access_token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: userId },
        message: { text: text }
      })
    }
  )
}