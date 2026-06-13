import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
import { timingSafeEqualStr } from '@/lib/webhook-security'
import { applyRateLimit, genericError } from '@/lib/api-guard'

export const dynamic = 'force-dynamic'

function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    return timingSafeEqualStr(auth.slice('Bearer '.length), expected)
  }
  const url = new URL(request.url)
  const querySecret = url.searchParams.get('secret')
  if (querySecret) {
    return timingSafeEqualStr(querySecret, expected)
  }
  return false
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = applyRateLimit(request, 'keep-alive', { limit: 6, windowMs: 60_000 })
  if (!rl.allowed) return rl.response!

  try {
    const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl, serviceKey)

    const { error } = await supabase
      .from('talks')
      .select('id', { head: true })

    if (error) {
      logger.error('keep_alive.ping_failed', { message: error.message })
      return NextResponse.json({ ok: false }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return genericError('keep-alive', error)
  }
}
