import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateRegistrationOptions } from '@/lib/auth/webauthn'

/**
 * POST /api/auth/webauthn/register
 * 
 * Generate WebAuthn registration options for enrolling a new credential
 * This endpoint creates the challenge and options needed for credential creation
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', user.id)
      .single()

    const userName = user.email || 'user'
    const userDisplayName = profile?.username || userName

    // Generate registration options with userVerification: 'required'
    // This ensures device PIN/biometric is required
    
    // Get RP ID from request origin (must match the domain where WebAuthn is called)
    const origin = request.headers.get('origin') || request.headers.get('referer') || ''
    let rpId = 'localhost' // Default for localhost
    
    if (origin) {
      try {
        const originUrl = new URL(origin)
        rpId = originUrl.hostname // Use hostname (without port) for RP ID
        // For localhost, just use 'localhost' (WebAuthn doesn't allow ports in RP ID)
        if (rpId === 'localhost' || rpId.startsWith('127.0.0.1')) {
          rpId = 'localhost'
        }
      } catch {
        // If URL parsing fails, use default
        rpId = 'localhost'
      }
    }
    
    const options = generateRegistrationOptions(
      user.id,
      userName,
      userDisplayName,
      'Brain Battle',
      rpId
    )

    // Store challenge in session or database for verification
    // For now, we'll return it and verify it on the client
    // In production, store it server-side with expiration

    return NextResponse.json({
      success: true,
      options
    })
  } catch (error: any) {
    console.error('❌ [WEBAUTHN] Registration options error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate registration options' },
      { status: 500 }
    )
  }
}

