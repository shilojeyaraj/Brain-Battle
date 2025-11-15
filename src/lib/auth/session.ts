"use client"

import { createClient } from "@/lib/supabase/client"

export interface User {
  id: string
  email: string
  username: string
  avatar_url?: string
  created_at: string
  updated_at: string
  last_login?: string
}

/**
 * Get current user ID from localStorage (client-side)
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    if (typeof window === 'undefined') return null
    const userId = localStorage.getItem('userId')
    return userId || null
  } catch (error) {
    console.error('Error getting current user ID:', error)
    return null
  }
}

/**
 * Check if user is logged in (client-side)
 */
export async function isUserLoggedIn(): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false
    const userId = localStorage.getItem('userId')
    return !!userId
  } catch (error) {
    return false
  }
}

/**
 * Sign out user (client-side)
 */
export async function signOut() {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userId')
      window.location.href = '/'
    }
  } catch (error) {
    console.error('Error signing out:', error)
  }
}

/**
 * Legacy functions for backward compatibility
 * These are deprecated - use Supabase Auth directly
 */
export function setUserSession(user: User) {
  // No-op: Supabase handles session via cookies
  console.warn('setUserSession is deprecated. Supabase Auth handles sessions automatically.')
}

export function getUserSession(): User | null {
  // No-op: Use getCurrentUser() instead
  console.warn('getUserSession is deprecated. Use getCurrentUser() instead.')
  return null
}

export function clearUserSession() {
  // Use signOut() instead
  console.warn('clearUserSession is deprecated. Use signOut() instead.')
}
