import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // In the browser, Next.js replaces process.env.NEXT_PUBLIC_* at build time
  // But we need to handle the case where they might not be available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ [SUPABASE CLIENT] Missing environment variables')
    console.error('  NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
    console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseAnonKey)
    throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
