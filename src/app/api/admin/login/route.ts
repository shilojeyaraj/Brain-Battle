import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminPassword, createAdminSession, setAdminSessionCookie } from '@/lib/auth/admin-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    const isValid = await verifyAdminPassword(password)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid admin password' },
        { status: 401 }
      )
    }

    // Create admin session
    const token = await createAdminSession()
    await setAdminSessionCookie(token)

    return NextResponse.json({ 
      success: true,
      message: 'Admin authentication successful'
    })
  } catch (error) {
    console.error('❌ [ADMIN LOGIN] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

