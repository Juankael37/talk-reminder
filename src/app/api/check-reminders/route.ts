import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'

const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  
  if (!accountSid || !authToken || !accountSid.startsWith('AC')) {
    return null
  }
  
  const twilio = require('twilio')
  return twilio(accountSid, authToken)
}

export async function POST() {
  try {
    const supabase = await createClient()
    
    const now = new Date().toISOString()
    
    const { data: dueRules, error: rulesError } = await supabase
      .from('reminder_rules')
      .select('*, talks(*)')
      .eq('is_sent', false)
      .lte('scheduled_time', now)
    
    if (rulesError) {
      console.error('Error fetching rules:', rulesError)
      return NextResponse.json({error: rulesError.message}, {status: 500})
    }
    
    if (!dueRules || dueRules.length === 0) {
      return NextResponse.json({message: 'No reminders due', sent: 0})
    }
    
    const twilioClient = getTwilioClient()
    let sentCount = 0
    
    for (const rule of dueRules) {
      const talk = rule.talks
      if (!talk || !talk.phone_number) continue
      
      const message = `Reminder: ${talk.speaker_name}${talk.talk_title ? ` - "${talk.talk_title}"` : ''} is scheduled in ${rule.offset_label}.`
      
      try {
        if (twilioClient) {
          await twilioClient.messages.create({
            body: message,
            to: talk.phone_number,
            from: process.env.TWILIO_PHONE_NUMBER,
          })
        }
        
        await supabase
          .from('reminder_rules')
          .update({is_sent: true})
          .eq('id', rule.id)
        
        await supabase
          .from('reminder_logs')
          .insert({
            rule_id: rule.id,
            response: twilioClient ? 'Sent via Twilio' : 'Skipped (no Twilio config)',
          })
        
        sentCount++
      } catch (twilioError) {
        console.error('Twilio error:', twilioError)
        
        await supabase
          .from('reminder_logs')
          .insert({
            rule_id: rule.id,
            response: twilioError instanceof Error ? twilioError.message : 'Error',
          })
      }
    }
    
    return NextResponse.json({message: 'Done', sent: sentCount})
  } catch (error) {
    console.error('Error in check-reminders:', error)
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Internal error'},
      {status: 500}
    )
  }
}

export async function GET() {
  return POST()
}