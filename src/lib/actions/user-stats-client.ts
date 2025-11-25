"use client"

import { createClient } from "@/lib/supabase/client"

export interface UserStats {
  level: number
  xp: number
  total_wins: number
  total_losses: number
  total_games: number
  win_streak: number
  best_streak: number
  total_questions_answered: number
  correct_answers: number
  accuracy: number
  average_response_time: number
  favorite_subject: string | null
}

export interface UserProfile {
  id: string
  username: string
  email: string
  created_at: string
  last_login: string | null
  stats: UserStats
}

export async function getUserStatsClient(userId: string): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
  try {
    const supabase = createClient()
    
    // Validate userId is provided
    if (!userId) {
      console.error('Error: userId is required')
      return { success: false, error: 'User ID is required' }
    }
    
    // Get user profile from profiles table (profiles table doesn't have email column)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, username, created_at, last_login')
      .eq('user_id', userId)
      .single()
    
    // Check if profile exists - handle various "not found" scenarios
    const hasProfileData = !!profileData
    const hasProfileError = !!profileError
    const isEmptyError = hasProfileError && Object.keys(profileError).length === 0
    const isNotFoundError = hasProfileError && (
      profileError.code === 'PGRST116' ||
      profileError.message?.includes('No rows') ||
      profileError.message?.includes('not found') ||
      profileError.message?.includes('does not exist')
    )
    
    // Profile is "not found" if we have no data and either no error (successful query with no results) 
    // or an error that indicates "not found"
    const profileNotFound = !hasProfileData && (isEmptyError || isNotFoundError || !hasProfileError)
    
    let finalProfileData = profileData
    
    // If profile doesn't exist, create it via API route (uses admin client to bypass RLS)
    if (profileNotFound) {
      console.log('📝 [USER STATS] Profile not found, creating one for user:', userId)
      
      // First, try to get the username from the users table
      let username: string | null = null
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('username')
          .eq('id', userId)
          .single()
        
        if (userData?.username) {
          username = userData.username
          console.log('✅ [USER STATS] Found username from users table:', username)
        }
      } catch (error) {
        console.warn('⚠️ [USER STATS] Could not fetch username from users table:', error)
      }
      
      // Fallback to generated username if not found in users table
      if (!username) {
        username = `user_${userId.slice(0, 8)}`
        console.log('⚠️ [USER STATS] Using generated username:', username)
      }
      
      // Use API route to create profile (bypasses RLS)
      try {
        const response = await fetch('/api/user-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            username: username
            // Note: profiles table doesn't have email column
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            console.log('✅ [USER STATS] Profile created successfully via API')
            finalProfileData = {
              user_id: result.data.user_id,
              username: result.data.username,
              created_at: result.data.created_at,
              last_login: result.data.last_login
            }
          }
        } else {
          let errorText = ''
          let errorData: any = {}
          try {
            errorText = await response.text()
            if (errorText) {
              try {
                errorData = JSON.parse(errorText)
              } catch (parseError) {
                // Response is not JSON, use the text as error message
                errorData = { error: errorText, rawResponse: errorText }
              }
            } else {
              // Empty response body
              errorData = { error: `HTTP ${response.status}: ${response.statusText || 'No error message'}` }
            }
          } catch (e) {
            errorData = { 
              error: errorText || `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`,
              parseError: e instanceof Error ? e.message : String(e)
            }
          }
          console.error('❌ [USER STATS] Failed to create profile via API:', errorData)
          console.error('❌ [USER STATS] Response status:', response.status)
          console.error('❌ [USER STATS] Response headers:', Object.fromEntries(response.headers.entries()))
          
          // Log the raw response for debugging
          if (errorText) {
            console.error('❌ [USER STATS] Raw response text:', errorText)
          }
        }
      } catch (apiError) {
        console.error('❌ [USER STATS] Error calling profile API:', apiError)
      }
    } else if (hasProfileError && !isEmptyError && !isNotFoundError) {
      // Real error (not just "not found" or empty) - only log meaningful errors
      const errorKeys = Object.keys(profileError)
      if (errorKeys.length > 0) {
        console.error('❌ [USER STATS] Error fetching profile:', profileError)
      }
      // Continue with auth user data as fallback
    }
    
    // Use profile data if available, otherwise create default user data
    // Note: profiles table doesn't store email, get it from users table if needed
    const userData = finalProfileData ? {
      id: finalProfileData.user_id,
      username: finalProfileData.username || `user_${userId.slice(0, 8)}`,
      email: '', // Email is stored in users table, not profiles
      created_at: finalProfileData.created_at || new Date().toISOString(),
      last_login: finalProfileData.last_login || null
    } : {
      id: userId,
      username: `user_${userId.slice(0, 8)}`,
      email: '', // Email is stored in users table, not profiles
      created_at: new Date().toISOString(),
      last_login: null
    }
    
    // Get user stats
    const { data: statsData, error: statsError } = await supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (statsError || !statsData) {
      // Create default stats if none exist via API route (bypasses RLS)
      try {
        const response = await fetch('/api/player-stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            stats: {
              level: 1,
              xp: 0,
              total_wins: 0,
              total_losses: 0,
              total_games: 0,
              win_streak: 0,
              best_streak: 0,
              total_questions_answered: 0,
              correct_answers: 0,
              accuracy: 0.00,
              average_response_time: 0.00,
              favorite_subject: null
            }
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            console.log('✅ [USER STATS] Stats created successfully via API')
            return {
              success: true,
              data: {
                ...userData,
                stats: result.data
              }
            }
          } else {
            const errorText = result.error || 'Unknown error'
            console.error('❌ [USER STATS] Failed to create stats via API:', errorText)
            return { success: false, error: `Failed to create user stats: ${errorText}` }
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('❌ [USER STATS] Failed to create stats via API - HTTP error:', response.status, errorData)
          return { success: false, error: `Failed to create user stats: ${errorData.error || 'HTTP ' + response.status}` }
        }
      } catch (apiError) {
        console.error('❌ [USER STATS] Error calling stats API:', apiError)
        return { success: false, error: 'Failed to create user stats' }
      }
    }
    
    return {
      success: true,
      data: {
        ...userData,
        stats: statsData
      }
    }
  } catch (error: unknown) {
    console.error('Error fetching user stats:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return { success: false, error: errorMessage }
  }
}
