import "server-only"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { getUserIdFromSession } from "./session-cookies"

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
 * Get current user session (server-side) - uses secure cookie-based session
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) return null
    
    // Fetch user from database
    const supabase = createAdminClient()
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error || !user) {
      console.error('Error fetching user:', error)
      return null
    }
    
    return {
      id: user.id,
      email: user.email || '',
      username: user.username,
      avatar_url: user.avatar_url || undefined,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login: user.last_login || undefined,
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Get current user ID (server-side) - from secure session cookie
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    return await getUserIdFromSession()
  } catch (error) {
    console.error('Error getting current user ID:', error)
    return null
  }
}

/**
 * Check if user is logged in (server-side)
 */
export async function isUserLoggedIn(): Promise<boolean> {
  try {
    const userId = await getUserIdFromSession()
    return !!userId
  } catch (error) {
    return false
  }
}


