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
    // BUT: Only if user is authenticated (401 means not authenticated, don't try to create)
    if (profileNotFound) {
      // Check if user is authenticated first
      try {
        const authCheck = await fetch('/api/user/current', {
          credentials: 'include',
          cache: 'no-store'
        })
        
        if (!authCheck.ok || authCheck.status === 401) {
          // User is not authenticated - don't try to create profile
          console.log('⚠️ [USER STATS] User not authenticated, skipping profile creation')
          return { 
            success: false, 
            error: 'User not authenticated' 
          }
        }
      } catch (authError) {
        // Can't verify auth - don't create profile
        console.warn('⚠️ [USER STATS] Could not verify authentication, skipping profile creation')
        return { 
          success: false, 
          error: 'Authentication check failed' 
        }
      }
      
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
          credentials: 'include',
          body: JSON.stringify({
            user_id: userId,
            username: username
            // Note: profiles table doesn't have email column
          })
        })
        
        if (response.status === 401) {
          // User is not authenticated
          return { 
            success: false, 
            error: 'User not authenticated' 
          }
        }
        
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
          // Don't log empty error objects - only log meaningful errors
          const errorText = await response.text().catch(() => '')
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText)
              if (errorData.error) {
                console.error('❌ [USER STATS] Failed to create profile:', errorData.error)
              }
            } catch {
              // Not JSON, ignore
            }
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
    
    // Stats are auto-created when quiz results are saved, so just return defaults if none exist
    // Don't try to POST to /api/player-stats as it's disabled for security
    if (statsError || !statsData) {
      // Return default stats - they'll be created automatically when user completes their first quiz
      const defaultStats = {
        user_id: userId,
        level: 1,
        xp: 0,
        total_wins: 0,
        total_losses: 0,
        total_games: 0,
        win_streak: 0,
        best_streak: 0,
        total_questions_answered: 0,
        correct_answers: 0,
        accuracy: 0,
        average_response_time: 0,
        favorite_subject: null,
        daily_streak: 0,
        longest_streak: 0,
        last_activity_date: null
      }
      
      console.log('ℹ️ [USER STATS] No stats found - returning defaults. Stats will be created when user completes their first quiz.')
      
      return {
        success: true,
        data: {
          ...userData,
          stats: defaultStats
        }
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
