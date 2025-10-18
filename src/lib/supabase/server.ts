import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  try {
    const cookieStore = await cookies()

    // Debug: Log all environment variables that contain SUPABASE
    console.log('🔍 [SUPABASE SERVER] Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      allSupabaseKeys: Object.keys(process.env).filter(key => key.includes('SUPABASE')),
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      urlValue: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      keyValue: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING'
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ [SUPABASE SERVER] Missing environment variables:', {
        NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: !!supabaseAnonKey,
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        allEnvKeys: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
      })
      throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
    }

    return createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
  } catch (error) {
    console.error('❌ [SUPABASE SERVER] Error creating client:', error)
    throw new Error('Failed to create Supabase client. Please check your configuration.')
  }
}
