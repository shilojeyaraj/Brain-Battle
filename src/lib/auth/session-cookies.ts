import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const SECRET_KEY = process.env.SESSION_SECRET || 'your-secret-key-change-in-production'
const SESSION_COOKIE_NAME = 'brain-brawl-session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

/**
 * Create a signed session token
 */
export async function createSessionToken(userId: string): Promise<string> {
  const secret = new TextEncoder().encode(SECRET_KEY)
  
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret)
  
  return token
}

/**
 * Verify and extract userId from session token
 */
export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const secret = new TextEncoder().encode(SECRET_KEY)
    const { payload } = await jwtVerify(token, secret)
    
    if (typeof payload.userId === 'string') {
      return payload.userId
    }
    return null
  } catch (error) {
    console.error('❌ [SESSION] Token verification failed:', error)
    return null
  }
}

/**
 * Set session cookie in response
 */
export async function setSessionCookie(userId: string): Promise<string> {
  const token = await createSessionToken(userId)
  const cookieStore = await cookies()
  
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  
  return token
}

/**
 * Get userId from session cookie (server-side)
 */
export async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
    
    if (!token) {
      return null
    }
    
    return await verifySessionToken(token)
  } catch (error) {
    console.error('❌ [SESSION] Error reading session:', error)
    return null
  }
}

/**
 * Get userId from request (for API routes)
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    
    if (!token) {
      return null
    }
    
    return await verifySessionToken(token)
  } catch (error) {
    console.error('❌ [SESSION] Error reading session from request:', error)
    return null
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

