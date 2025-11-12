import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAuthenticationOptions } from '@/lib/auth/webauthn'

/**
 * POST /api/auth/webauthn/authenticate
 * 
 * Generate WebAuthn authentication options for login
 * This endpoint creates the challenge needed for credential verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // First, sign in with password to verify credentials
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if user has WebAuthn MFA enabled
    // Since Supabase doesn't support WebAuthn as an MFA factor,
    // we check our custom webauthn_credentials table
    const { data: credentials, error: credentialsError } = await supabase
      .from('webauthn_credentials')
      .select('credential_id')
      .eq('user_id', authData.user.id)

    if (credentialsError) {
      console.error('❌ [WEBAUTHN] Credentials check error:', credentialsError)
      return NextResponse.json(
        { error: 'Failed to check WebAuthn credentials' },
        { status: 500 }
      )
    }

    if (!credentials || credentials.length === 0) {
      return NextResponse.json(
        { error: 'WebAuthn MFA not enabled for this account' },
        { status: 400 }
      )
    }

    // Generate authentication options with userVerification: 'required'
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

    // Get credential IDs for this user
    const credentialIds = credentials.map(c => c.credential_id)

    const options = generateAuthenticationOptions(
      credentialIds, // Allow credentials for this user
      rpId
    )

    // Store challenge and user session for verification
    // In production, store this server-side with expiration
    // For now, we'll include it in the response and verify it matches

    return NextResponse.json({
      success: true,
      options,
      userId: authData.user.id,
      session: null // No session yet, need WebAuthn verification
    })
  } catch (error: any) {
    console.error('❌ [WEBAUTHN] Authentication options error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate authentication options' },
      { status: 500 }
    )
  }
}

