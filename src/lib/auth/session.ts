"use client"

import { createClient } from "@/lib/supabase/client"
import { User } from "./supabase-auth"

/**
 * Get current user session using Supabase Auth
 * Replaces the old localStorage-based session
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    // Get profile from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    return {
      id: user.id,
      email: user.email!,
      username: profile?.username || user.user_metadata?.username || 'user',
      avatar_url: profile?.avatar_url,
      created_at: profile?.created_at || user.created_at,
      updated_at: profile?.updated_at || new Date().toISOString(),
      last_login: profile?.last_login
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Get current user ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || null
  } catch (error) {
    console.error('Error getting current user ID:', error)
    return null
  }
}

/**
 * Check if user is logged in
 */
export async function isUserLoggedIn(): Promise<boolean> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return !!user
  } catch (error) {
    return false
  }
}

/**
 * Sign out user
 */
export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  // Redirect handled by component
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
