import "server-only"
import { createClient } from "@/lib/supabase/server"
import { createClient as createDbClient } from "@/db"

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
 * Get current user session (server-side) - uses custom auth with users table
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // Custom auth: session is managed client-side via localStorage
    // For server-side, we'd need to pass user ID from client
    // This function is kept for compatibility but returns null
    // Use client-side session management instead
    return null
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Get current user ID (server-side)
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    // Custom auth: session is managed client-side
    return null
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
    // Custom auth: session is managed client-side
    return false
  } catch (error) {
    return false
  }
}


