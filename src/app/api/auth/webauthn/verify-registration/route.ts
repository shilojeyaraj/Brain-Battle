import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/auth/webauthn/verify-registration
 * 
 * Verify and store a newly registered WebAuthn credential
 * This endpoint receives the credential from the client and stores it
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

    const body = await request.json()
    const { credential, challenge } = body

    if (!credential || !challenge) {
      return NextResponse.json(
        { error: 'Missing credential or challenge' },
        { status: 400 }
      )
    }

    // TODO: Verify the challenge and credential on the server
    // This requires:
    // 1. Verifying the challenge matches what was sent (store challenges server-side)
    // 2. Verifying the attestation signature using a WebAuthn library
    // 3. Extracting and storing the public key
    // 4. Storing the credential ID for future authentication

    // For now, we'll store the credential in our custom table
    // Since Supabase doesn't support WebAuthn as an MFA factor type,
    // we store it separately and check for it during authentication

    // Extract credential data
    const credentialId = credential.rawId || credential.id
    const publicKey = JSON.stringify(credential.response.attestationObject || {})

    // Store credential in our custom table
    const { data: storedCredential, error: storeError } = await supabase
      .from('webauthn_credentials')
      .insert({
        user_id: user.id,
        credential_id: credentialId,
        public_key: publicKey,
        device_type: 'platform',
        device_name: 'Device PIN/Biometric'
      })
      .select()
      .single()

    if (storeError) {
      console.error('❌ [WEBAUTHN] Storage error:', storeError)
      return NextResponse.json(
        { error: storeError.message || 'Failed to store WebAuthn credential' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      credentialId: storedCredential.id,
      message: 'WebAuthn credential enrolled successfully'
    })
  } catch (error: any) {
    console.error('❌ [WEBAUTHN] Verify registration error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify registration' },
      { status: 500 }
    )
  }
}

