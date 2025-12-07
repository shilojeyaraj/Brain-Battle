/**
 * Admin Authentication
 * 
 * Separate authentication system for admin access using a password
 * stored in environment variables. This is independent of user authentication.
 */

import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'

const ADMIN_SECRET = process.env.ADMIN_PASSWORD || ''
const ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || process.env.SESSION_SECRET || 'admin-secret-change-in-production'
)

const ADMIN_COOKIE_NAME = 'admin_session'
const ADMIN_SESSION_DURATION = 8 * 60 * 60 * 1000 // 8 hours

export interface AdminSession {
  isAdmin: boolean
  authenticatedAt: number
  [key: string]: unknown // Add index signature for JWTPayload compatibility
}

/**
 * Verify admin password and create session
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!ADMIN_SECRET) {
    console.error('❌ [ADMIN AUTH] ADMIN_PASSWORD environment variable not set')
    return false
  }
  
  return password === ADMIN_SECRET
}

/**
 * Create admin session token
 */
export async function createAdminSession(): Promise<string> {
  const session: AdminSession = {
    isAdmin: true,
    authenticatedAt: Date.now()
  }

  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(ADMIN_JWT_SECRET)

  return token
}

/**
 * Verify admin session token
 */
export async function verifyAdminSession(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, ADMIN_JWT_SECRET)
    return payload as AdminSession
  } catch (error) {
    return null
  }
}

/**
 * Get admin session from cookies
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  return verifyAdminSession(token)
}

/**
 * Set admin session cookie
 */
export async function setAdminSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ADMIN_SESSION_DURATION / 1000,
    path: '/'
  })
}

/**
 * Clear admin session cookie
 */
export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE_NAME)
}

/**
 * Check if request is from authenticated admin
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const session = await getAdminSession()
  return session?.isAdmin === true
}

