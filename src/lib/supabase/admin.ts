import { createClient } from '@supabase/supabase-js'

let adminClient: ReturnType<typeof createClient> | null = null

export function createAdminClient() {
  if (!adminClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      throw new Error(`Missing env vars: NEXT_PUBLIC_SUPABASE_URL=${!!supabaseUrl}, SUPABASE_SERVICE_ROLE_KEY=${!!serviceKey}`)
    }
    
    adminClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  
  return adminClient
}