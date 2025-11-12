import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/actions/custom-auth'

/**
 * API route to verify MFA code after initial password authentication
 * This is called when user has MFA enabled and needs to provide TOTP code
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, totpCode, userId } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (!totpCode) {
      return NextResponse.json(
        { success: false, error: 'MFA code is required' },
        { status: 400 }
      )
    }

    // Authenticate with MFA code
    const result = await authenticateUser(email, password, totpCode)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'MFA verification failed' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: result.user
    })
  } catch (error: unknown) {
    console.error('❌ [API MFA] Server error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { success: false, error: `MFA verification failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}

