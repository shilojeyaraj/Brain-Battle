import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { randomUUID } from 'crypto'

// CRITICAL: SESSION_SECRET must be set in production
const SECRET_KEY = process.env.SESSION_SECRET
if (!SECRET_KEY || SECRET_KEY === 'your-secret-key-change-in-production') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '❌ CRITICAL: SESSION_SECRET environment variable must be set in production. ' +
      'Generate a secure secret: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    )
  }
  // Allow default in development only
  console.warn('⚠️ [SECURITY] Using default SESSION_SECRET in development. Set SESSION_SECRET in production!')
}

const SESSION_COOKIE_NAME = 'brain-brawl-session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

/**
 * Create a signed session token with unique session ID
 */
export async function createSessionToken(userId: string, sessionId?: string): Promise<string> {
  if (!SECRET_KEY) {
    throw new Error('SESSION_SECRET not configured')
  }
  const secret = new TextEncoder().encode(SECRET_KEY)
  
  // Generate unique session ID if not provided
  const uniqueSessionId = sessionId || randomUUID()
  
  const token = await new SignJWT({ userId, sessionId: uniqueSessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret)
  
  return token
}

/**
 * Verify and extract userId and sessionId from session token
 */
export async function verifySessionToken(token: string): Promise<{ userId: string; sessionId: string } | null> {
  try {
    if (!SECRET_KEY) {
      console.error('❌ [SESSION] SESSION_SECRET not configured')
      return null
    }
    const secret = new TextEncoder().encode(SECRET_KEY)
    const { payload } = await jwtVerify(token, secret)
    
    if (typeof payload.userId === 'string' && typeof payload.sessionId === 'string') {
      return { userId: payload.userId, sessionId: payload.sessionId }
    }
    return null
  } catch (error) {
    console.error('❌ [SESSION] Token verification failed:', error)
    return null
  }
}

/**
 * Check if session is valid in database (single-device enforcement)
 */
export async function validateSessionInDatabase(userId: string, sessionId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('user_sessions')
      .select('id, expires_at, is_active')
      .eq('user_id', userId)
      .eq('session_token', sessionId)
      .eq('is_active', true)
      .single()
    
    if (error || !data) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ [SESSION] Session not found in database:', { userId, sessionId, error: error?.message })
      }
      return false
    }
    
    // Check if session has expired
    if (new Date(data.expires_at) < new Date()) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ [SESSION] Session expired:', { userId, sessionId, expiresAt: data.expires_at })
      }
      // Mark as inactive
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', data.id)
      return false
    }
    
    return true
  } catch (error) {
    console.error('❌ [SESSION] Error validating session in database:', error)
    return false
  }
}

/**
 * Set session cookie in response
 * This also invalidates any previous sessions for the user (single-device enforcement)
 * 
 * @param userId - The user ID to create a session for
 * @param request - Optional NextRequest (for API routes, to get user-agent/IP)
 * @param response - Optional NextResponse (for API routes, to set cookie on response)
 * @returns The session token
 */
export async function setSessionCookie(
  userId: string, 
  request?: NextRequest,
  response?: NextResponse
): Promise<string> {
  const supabase = createAdminClient()
  
  // Invalidate all previous active sessions for this user (single-device login)
  const { error: invalidateError } = await supabase
    .from('user_sessions')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true)
  
  if (invalidateError) {
    console.error('❌ [SESSION] Error invalidating previous sessions:', invalidateError)
    // Continue anyway - don't block login
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [SESSION] Invalidated previous sessions for user:', userId)
    }
  }
  
  // Generate new session ID and token
  const sessionId = randomUUID()
  const token = await createSessionToken(userId, sessionId)
  
  // Calculate expiration time
  const expiresAt = new Date()
  expiresAt.setSeconds(expiresAt.getSeconds() + SESSION_MAX_AGE)
  
  // Get user agent and IP for tracking
  const userAgent = request?.headers.get('user-agent') || null
  const ipAddress = request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request?.headers.get('x-real-ip') 
    || null
  
  // Store session in database
  const { error: insertError } = await supabase
    .from('user_sessions')
    .insert({
      user_id: userId,
      session_token: sessionId,
      expires_at: expiresAt.toISOString(),
      is_active: true,
      user_agent: userAgent,
      ip_address: ipAddress,
    })
  
  if (insertError) {
    console.error('❌ [SESSION] Error storing session in database:', insertError)
    // Continue anyway - session cookie will still work, but won't be tracked
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [SESSION] Session stored in database:', { userId, sessionId })
    }
  }
  
  // Determine domain for production (should match your production domain)
  const isProduction = process.env.NODE_ENV === 'production'
  const domain = isProduction ? process.env.COOKIE_DOMAIN : undefined
  
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: 'lax' as const, // Allows cookies on same-site requests and top-level navigations
    maxAge: SESSION_MAX_AGE,
    path: '/',
    ...(domain && { domain }), // Only set domain if specified (for production)
  }
  
  // If response is provided (API route), set cookie on response
  // Otherwise, use cookies() helper (server action/component)
  if (response) {
    response.cookies.set(SESSION_COOKIE_NAME, token, cookieOptions)
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [SESSION] Session cookie set on NextResponse for user:', userId)
    }
  } else {
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, token, cookieOptions)
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [SESSION] Session cookie set via cookies() helper for user:', userId)
    }
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('   Cookie settings:', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
      domain: domain || 'not set (default)',
    })
  }
  
  return token
}

/**
 * Get userId from session cookie (server-side)
 * Also validates session in database (single-device enforcement)
 */
export async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
    
    if (!token) {
      return null
    }
    
    const sessionData = await verifySessionToken(token)
    if (!sessionData) {
      return null
    }
    
    // Validate session in database (check if still active)
    const isValid = await validateSessionInDatabase(sessionData.userId, sessionData.sessionId)
    if (!isValid) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ [SESSION] Session invalidated (user logged in on another device)')
      }
      return null
    }
    
    return sessionData.userId
  } catch (error) {
    console.error('❌ [SESSION] Error reading session:', error)
    return null
  }
}

/**
 * Get userId from request (for API routes)
 * Also validates session in database (single-device enforcement)
 */
export interface SessionValidationResult {
  userId: string | null
  errorCode?: 'NO_TOKEN' | 'INVALID_TOKEN' | 'SESSION_EXPIRED' | 'LOGGED_IN_ELSEWHERE' | 'SESSION_NOT_FOUND'
  errorMessage?: string
}

export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const result = await getUserIdFromRequestWithDetails(request)
  return result.userId
}

export async function getUserIdFromRequestWithDetails(request: NextRequest): Promise<SessionValidationResult> {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    
    if (!token) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ [SESSION] No token found in cookie')
      }
      return {
        userId: null,
        errorCode: 'NO_TOKEN',
        errorMessage: 'No session found. Please log in.'
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [SESSION] Verifying token...')
    }
    
    const sessionData = await verifySessionToken(token)
    if (!sessionData) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ [SESSION] Token verification failed - token is invalid or expired')
      }
      return {
        userId: null,
        errorCode: 'INVALID_TOKEN',
        errorMessage: 'Your session has expired. Please log in again.'
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [SESSION] Token verified, userId:', sessionData.userId, 'sessionId:', sessionData.sessionId)
    }
    
    // Validate session in database (check if still active)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [SESSION] Validating session in database...')
    }
    
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('user_sessions')
      .select('id, expires_at, is_active')
      .eq('user_id', sessionData.userId)
      .eq('session_token', sessionData.sessionId)
      .single()
    
    if (error || !data) {
      // Check if there's an active session for this user (meaning they logged in elsewhere)
      const { data: activeSession } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('user_id', sessionData.userId)
        .eq('is_active', true)
        .limit(1)
      
      if (activeSession && activeSession.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ [SESSION] User logged in on another device')
        }
        return {
          userId: null,
          errorCode: 'LOGGED_IN_ELSEWHERE',
          errorMessage: 'You have been logged out because you logged in on another device. Please log in again.'
        }
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ [SESSION] Session not found in database')
      }
      return {
        userId: null,
        errorCode: 'SESSION_NOT_FOUND',
        errorMessage: 'Your session was not found. Please log in again.'
      }
    }
    
    // Check if session has expired
    if (new Date(data.expires_at) < new Date()) {
      // Mark as inactive
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', data.id)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ [SESSION] Session expired')
      }
      return {
        userId: null,
        errorCode: 'SESSION_EXPIRED',
        errorMessage: 'Your session has expired. Please log in again.'
      }
    }
    
    // Check if session is inactive
    if (!data.is_active) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ [SESSION] Session is inactive (user logged in on another device)')
      }
      return {
        userId: null,
        errorCode: 'LOGGED_IN_ELSEWHERE',
        errorMessage: 'You have been logged out because you logged in on another device. Please log in again.'
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [SESSION] Session validated in database')
    }
    
    return { userId: sessionData.userId }
  } catch (error) {
    console.error('❌ [SESSION] Error reading session from request:', error)
    return {
      userId: null,
      errorCode: 'INVALID_TOKEN',
      errorMessage: 'An error occurred while validating your session. Please log in again.'
    }
  }
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

/**
 * Clear session cookie in response
 */
export function clearSessionCookieResponse(response: NextResponse): NextResponse {
  response.cookies.delete(SESSION_COOKIE_NAME)
  return response
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(request?: NextRequest): Promise<string> {
  const userId = request 
    ? await getUserIdFromRequest(request)
    : await getUserIdFromSession()
  
  if (!userId) {
    throw new Error('Unauthorized')
  }
  
  return userId
}

