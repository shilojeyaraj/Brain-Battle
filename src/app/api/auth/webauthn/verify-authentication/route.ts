import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/auth/webauthn/verify-authentication
 * 
 * Verify a WebAuthn authentication response and complete login
 * This endpoint receives the credential assertion and verifies it
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { credential, userId, email, password, challenge } = body

    if (!credential || !userId || !email || !password || !challenge) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Re-authenticate with password to get session
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

    // TODO: Verify the WebAuthn credential assertion on the server
    // This requires:
    // 1. Verifying the challenge matches (should match the one we sent)
    // 2. Verifying the signature using the stored public key
    // 3. Verifying the authenticator data
    // 4. Checking the user verification flag (should be true)
    // 5. Checking the counter to prevent replay attacks

    // For now, we'll do basic validation
    // In production, use a WebAuthn library like @simplewebauthn/server
    // to properly verify the assertion

    const credentialId = credential.rawId || credential.id

    // Find the stored credential
    const { data: storedCredential, error: credentialError } = await supabase
      .from('webauthn_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('credential_id', credentialId)
      .single()

    if (credentialError || !storedCredential) {
      console.error('❌ [WEBAUTHN] Credential not found:', credentialError)
      return NextResponse.json(
        { error: 'Invalid WebAuthn credential' },
        { status: 401 }
      )
    }

    // TODO: Verify the signature using storedCredential.public_key
    // TODO: Verify the challenge matches
    // TODO: Verify user verification flag
    // TODO: Update counter to prevent replay attacks

    // For now, we'll accept it if the credential exists
    // In production, implement proper cryptographic verification

    // Update last used timestamp and counter
    await supabase
      .from('webauthn_credentials')
      .update({
        last_used_at: new Date().toISOString(),
        counter: storedCredential.counter + 1
      })
      .eq('id', storedCredential.id)

    // Get the session after successful verification
    const { data: { session } } = await supabase.auth.getSession()

    return NextResponse.json({
      success: true,
      session,
      user: authData.user
    })
  } catch (error: any) {
    console.error('❌ [WEBAUTHN] Verify authentication error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify authentication' },
      { status: 500 }
    )
  }
}

