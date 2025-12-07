import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const authenticated = await isAdminAuthenticated()
    
    return NextResponse.json({ 
      authenticated 
    })
  } catch (error) {
    // Don't expose error details, just return false
    console.error('❌ [ADMIN CHECK] Error:', error)
    return NextResponse.json({ 
      authenticated: false 
    })
  }
}

