import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { redirect } from 'next/navigation'

/**
 * Auth callback route for Supabase email confirmation
 * This handles the redirect after users click the confirmation link in their email
 * 
 * URL: /auth/callback?code=...&type=...
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')

  if (code) {
    const supabase = await createClient()
    
    // Exchange the code for a session (Supabase email confirmation uses 'code' parameter)
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('❌ [AUTH CALLBACK] Error exchanging code for session:', error)
      // Redirect to login with error
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message || 'Invalid or expired confirmation link')}`, requestUrl.origin)
      )
    }

    if (data?.user) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [AUTH CALLBACK] Email confirmed successfully for user:', data.user.id)
      }
      
      // Redirect to dashboard with newUser flag to show tutorial
      return NextResponse.redirect(
        new URL('/dashboard?newUser=true', requestUrl.origin)
      )
    }
  }

  // If no code or verification failed, redirect to login
  return NextResponse.redirect(
    new URL('/login?error=Invalid confirmation link', requestUrl.origin)
  )
}

