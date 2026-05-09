import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return new NextResponse('Missing credentials', { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    
    // Perform a lightweight query to wake up / keep the database active
    const { count, error } = await supabase
      .from('talks')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('Keep-alive ping failed:', error)
      return new NextResponse('Ping failed', { status: 500 })
    }

    console.log('Keep-alive ping successful.')
    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Error during keep-alive ping:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
