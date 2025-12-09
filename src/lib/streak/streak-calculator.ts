/**
 * Daily Streak Calculator
 * Tracks consecutive days of user activity based on quiz sessions
 * Includes a 48-hour grace period (2 days) before streak breaks
 */

import { createAdminClient } from '@/lib/supabase/server-admin'

export interface StreakData {
  currentStreak: number
  longestStreak: number
  lastActivityDate: string | null
  isActiveToday: boolean
  daysUntilBreak: number
}

/**
 * Calculate user's daily streak based on quiz session activity
 * Uses database function for accurate calculation with 48-hour grace period
 * Also initializes streak to 1 for new users on their first login
 */
export async function calculateUserStreak(userId: string): Promise<StreakData> {
  const adminClient = createAdminClient()
  
  try {
    // First, check if user has any stats record
    const { data: stats } = await adminClient
      .from('player_stats')
      .select('daily_streak, last_activity_date, longest_streak')
      .eq('user_id', userId)
      .single()

    // If no stats exist or no activity date, initialize streak to 1 for today
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    
    if (!stats || !stats.last_activity_date) {
      // New user - initialize streak to 1 for today
      console.log('🆕 [STREAK] Initializing streak for new user')
      
      await adminClient
        .from('player_stats')
        .upsert({
          user_id: userId,
          daily_streak: 1,
          last_activity_date: today,
          longest_streak: 1,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
      
      return {
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: today,
        isActiveToday: true,
        daysUntilBreak: 2 // Full grace period
      }
    }

    // Call the database function to calculate streak
    const { data, error } = await adminClient
      .rpc('calculate_daily_streak', { p_user_id: userId })

    if (error) {
      console.error('❌ [STREAK] Error calling calculate_daily_streak function:', error)
      
      // Fallback: manual calculation if function doesn't exist
      return await calculateStreakManually(userId, adminClient)
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ [STREAK] No data returned from calculate_daily_streak')
      
      // If user has stats but no activity today, ensure they have at least streak 1 if logged in today
      if (stats.last_activity_date !== today) {
        // User logged in today but hasn't completed a quiz - set streak to 1 for today
        await adminClient
          .from('player_stats')
          .update({
            daily_streak: 1,
            last_activity_date: today,
            longest_streak: Math.max(1, stats.longest_streak || 0),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
        
        return {
          currentStreak: 1,
          longestStreak: Math.max(1, stats.longest_streak || 0),
          lastActivityDate: today,
          isActiveToday: true,
          daysUntilBreak: 2
        }
      }
      
      return {
        currentStreak: stats.daily_streak || 0,
        longestStreak: stats.longest_streak || 0,
        lastActivityDate: stats.last_activity_date || null,
        isActiveToday: stats.last_activity_date === today,
        daysUntilBreak: 0
      }
    }

    const result = data[0]
    
    // If user has no activity today but logged in, ensure streak is at least 1
    const currentStreak = result.current_streak || 0
    const isActiveToday = result.is_active_today || false
    
    // If no activity today but user is logged in, initialize to 1
    if (!isActiveToday && currentStreak === 0 && stats.last_activity_date !== today) {
      await adminClient
        .from('player_stats')
        .update({
          daily_streak: 1,
          last_activity_date: today,
          longest_streak: Math.max(1, result.longest_streak || 0),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      
      return {
        currentStreak: 1,
        longestStreak: Math.max(1, result.longest_streak || 0),
        lastActivityDate: today,
        isActiveToday: true,
        daysUntilBreak: 2
      }
    }
    
    return {
      currentStreak: currentStreak,
      longestStreak: result.longest_streak || 0,
      lastActivityDate: result.last_activity_date || null,
      isActiveToday: isActiveToday,
      daysUntilBreak: result.days_until_break || 0
    }
  } catch (error) {
    console.error('❌ [STREAK] Error calculating streak:', error)
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      isActiveToday: false,
      daysUntilBreak: 0
    }
  }
}

/**
 * Fallback manual calculation if database function is not available
 */
async function calculateStreakManually(
  userId: string, 
  adminClient: ReturnType<typeof createAdminClient>
): Promise<StreakData> {
  try {
    // Get all unique activity dates from quiz sessions
    const { data: gameResults, error } = await adminClient
      .from('game_results')
      .select(`
        completed_at,
        quiz_sessions!inner(
          ended_at
        )
      `)
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })

    if (error) {
      console.error('❌ [STREAK] Error fetching activity dates:', error)
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        isActiveToday: false,
        daysUntilBreak: 0
      }
    }

    // Extract unique dates (YYYY-MM-DD format)
    const dates = new Set<string>()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    gameResults?.forEach((result: any) => {
      const date = new Date(result.completed_at || result.quiz_sessions?.ended_at)
      date.setHours(0, 0, 0, 0)
      dates.add(date.toISOString().split('T')[0])
    })

    // Calculate streak
    const sortedDates = Array.from(dates).sort().reverse() // Most recent first
    let streak = 0
    let checkDate = new Date(today)
    const isActiveToday = sortedDates[0] === today.toISOString().split('T')[0]

    // Count consecutive days from today backwards (with 48-hour grace period)
    let consecutiveDays = 0
    let lastCheckedDate = new Date(today)
    
    for (const dateStr of sortedDates) {
      const activityDate = new Date(dateStr + 'T00:00:00')
      const daysDiff = Math.floor((lastCheckedDate.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff <= 2) {
        // Within grace period (0-2 days)
        consecutiveDays++
        lastCheckedDate = activityDate
      } else {
        // Gap is too large, streak broken
        break
      }
    }

    streak = consecutiveDays

    // Get longest streak from player_stats
    const { data: stats } = await adminClient
      .from('player_stats')
      .select('longest_streak, last_activity_date')
      .eq('user_id', userId)
      .single()

    const longestStreak = Math.max(streak, stats?.longest_streak || 0)

    // Update streak in database
    await adminClient
      .from('player_stats')
      .update({
        daily_streak: streak,
        last_activity_date: sortedDates[0] || null,
        longest_streak: longestStreak,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    // Calculate days until break
    let daysUntilBreak = 0
    if (!isActiveToday && sortedDates[0]) {
      const lastActivity = new Date(sortedDates[0] + 'T00:00:00')
      const daysSince = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      daysUntilBreak = Math.max(0, 2 - daysSince) // 2 days grace period
    }

    return {
      currentStreak: streak,
      longestStreak,
      lastActivityDate: sortedDates[0] || null,
      isActiveToday,
      daysUntilBreak
    }
  } catch (error) {
    console.error('❌ [STREAK] Error in manual calculation:', error)
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      isActiveToday: false,
      daysUntilBreak: 0
    }
  }
}


