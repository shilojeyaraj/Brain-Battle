import { NextRequest, NextResponse } from 'next/server'
import { clearAdminSessionCookie } from '@/lib/auth/admin-auth'

export async function POST(request: NextRequest) {
  try {
    await clearAdminSessionCookie()
    
    return NextResponse.json({ 
      success: true,
      message: 'Admin session cleared'
    })
  } catch (error) {
    console.error('❌ [ADMIN LOGOUT] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

