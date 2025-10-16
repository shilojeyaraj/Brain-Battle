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
    
    // Get user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, username, email, created_at, last_login')
      .eq('id', userId)
      .single()
    
    if (userError || !userData) {
      return { success: false, error: 'User not found' }
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
