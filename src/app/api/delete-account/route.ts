import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
import { methodNotAllowed, applyRateLimit, genericError } from '@/lib/api-guard'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const rl = applyRateLimit(request, 'delete-account', { limit: 3, windowMs: 60_000 })
  if (!rl.allowed) return rl.response!

  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice('Bearer '.length).trim()
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)

    if (deleteError) {
      logger.error('delete_account.failed', { userId: user.id, message: deleteError.message })
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
    }

    logger.info('delete_account.success', { userId: user.id })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return genericError('delete-account', error)
  }
}

export async function GET() {
  return methodNotAllowed(['POST'])
}
