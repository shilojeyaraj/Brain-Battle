import { createClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client with service role key
 * This bypasses RLS and should ONLY be used in server-side API routes
 * for operations that need to bypass RLS (like creating profiles during signup)
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase admin environment variables. SUPABASE_SERVICE_ROLE_KEY is required for admin operations.')
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

