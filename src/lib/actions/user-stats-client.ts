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
    
    // Get authenticated user first (for fallback data)
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser || authUser.id !== userId) {
      console.error('Error getting auth user:', authError)
      return { success: false, error: 'User not authenticated' }
    }
    
    // Get user profile from profiles table (after Supabase Auth migration)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, username, email, created_at, last_login')
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
    
    // If profile doesn't exist, create it
    if (profileNotFound && authUser) {
      console.log('📝 [USER STATS] Profile not found, creating one for user:', userId)
      
      const username = authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'user'
      
      // Try to create profile - handle potential errors
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          username: username,
          email: authUser.email || null,
          created_at: authUser.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('user_id, username, email, created_at, last_login')
        .single()
      
      if (createError) {
        // Log detailed error information
        const errorDetails = {
          code: createError.code,
          message: createError.message,
          details: createError.details,
          hint: createError.hint,
          errorKeys: Object.keys(createError),
          fullError: createError
        }
        console.error('❌ [USER STATS] Error creating profile:', errorDetails)
        
        // If it's a unique constraint violation (username already taken), try with a different username
        if (createError.code === '23505' || createError.message?.includes('unique') || createError.message?.includes('duplicate')) {
          console.log('🔄 [USER STATS] Username conflict, trying with timestamp suffix')
          const uniqueUsername = `${username}_${Date.now().toString().slice(-6)}`
          
          const { data: retryProfile, error: retryError } = await supabase
            .from('profiles')
            .insert({
              user_id: userId,
              username: uniqueUsername,
              email: authUser.email || null,
              created_at: authUser.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('user_id, username, email, created_at, last_login')
            .single()
          
          if (retryError) {
            console.error('❌ [USER STATS] Retry also failed:', retryError)
            // Continue with auth user data as fallback
          } else {
            console.log('✅ [USER STATS] Profile created with unique username')
            finalProfileData = retryProfile
          }
        } else {
          // For other errors (like RLS), continue with auth user data as fallback
          console.log('⚠️ [USER STATS] Profile creation failed, using auth user data as fallback')
        }
      } else {
        console.log('✅ [USER STATS] Profile created successfully')
        finalProfileData = newProfile
      }
    } else if (hasProfileError && !isEmptyError && !isNotFoundError) {
      // Real error (not just "not found" or empty) - only log meaningful errors
      const errorKeys = Object.keys(profileError)
      if (errorKeys.length > 0) {
        console.error('❌ [USER STATS] Error fetching profile:', profileError)
      }
      // Continue with auth user data as fallback
    }
    
    // Use profile data if available, otherwise use auth user data
    const userData = finalProfileData ? {
      id: finalProfileData.user_id,
      username: finalProfileData.username || 'user',
      email: finalProfileData.email || authUser.email || '',
      created_at: finalProfileData.created_at || authUser.created_at || new Date().toISOString(),
      last_login: finalProfileData.last_login || null
    } : {
      id: authUser.id,
      username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'user',
      email: authUser.email || '',
      created_at: authUser.created_at || new Date().toISOString(),
      last_login: null
    }
    
    // Get user stats
    const { data: statsData, error: statsError } = await supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (statsError || !statsData) {
      // Create default stats if none exist
      const { data: newStats, error: createError } = await supabase
        .from('player_stats')
        .insert({
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
          accuracy: 0.00,
          average_response_time: 0.00,
          favorite_subject: null
        })
        .select()
        .single()
      
      if (createError || !newStats) {
        console.error('Error creating stats:', createError)
        return { success: false, error: 'Failed to create user stats' }
      }
      
      return {
        success: true,
        data: {
          ...userData,
          stats: newStats
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
