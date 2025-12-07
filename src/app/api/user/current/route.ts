import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequestWithDetails } from '@/lib/auth/session-cookies'

/**
 * Get current authenticated user ID from session cookie
 */
export async function GET(request: NextRequest) {
  try {
    // Debug: Log cookie information in development
    if (process.env.NODE_ENV === 'development') {
      const cookies = request.cookies.getAll()
      const sessionCookie = request.cookies.get('brain-brawl-session')
      console.log('🔍 [CURRENT USER API] Cookie check:')
      console.log('   Total cookies:', cookies.length)
      console.log('   Session cookie exists:', !!sessionCookie)
      console.log('   Session cookie value length:', sessionCookie?.value?.length || 0)
      console.log('   Request URL:', request.url)
      console.log('   Request headers:', {
        'user-agent': request.headers.get('user-agent'),
        'referer': request.headers.get('referer'),
      })
    }
    
    const result = await getUserIdFromRequestWithDetails(request)
    
    if (!result.userId) {
      // Debug: Log why authentication failed
      if (process.env.NODE_ENV === 'development') {
        const sessionCookie = request.cookies.get('brain-brawl-session')
        console.log('❌ [CURRENT USER API] Authentication failed:')
        console.log('   Cookie exists:', !!sessionCookie)
        console.log('   Cookie value length:', sessionCookie?.value?.length || 0)
        console.log('   Error code:', result.errorCode)
        console.log('   Error message:', result.errorMessage)
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: result.errorMessage || 'Not authenticated',
          errorCode: result.errorCode,
          debug: process.env.NODE_ENV === 'development' ? {
            hasCookie: !!request.cookies.get('brain-brawl-session'),
            cookieCount: request.cookies.getAll().length,
          } : undefined,
        },
        { status: 401 }
      )
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [CURRENT USER API] User authenticated:', result.userId)
    }
    
    return NextResponse.json({ 
      success: true, 
      userId: result.userId
    })
  } catch (error) {
    console.error('❌ [CURRENT USER API] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        errorCode: 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && { details: String(error) }),
      },
      { status: 500 }
    )
  }
}

