import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  try {
    const cookieStore = await cookies()

    // Only log environment check in development and if there's an issue
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_SUPABASE === 'true') {
      console.log('🔍 [SUPABASE SERVER] Environment check:', {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      })
    }

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
        global: {
          fetch: (url, options = {}) => {
            // Increase timeout and add retry logic
            return fetch(url, {
              ...options,
              signal: AbortSignal.timeout(30000), // 30 second timeout instead of 10
            })
          },
        },
      }
    )
  } catch (error) {
    console.error('❌ [SUPABASE SERVER] Error creating client:', error)
    throw new Error('Failed to create Supabase client. Please check your configuration.')
  }
}
