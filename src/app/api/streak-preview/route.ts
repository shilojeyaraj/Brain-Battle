import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'

/**
 * API route to fetch top streak data for homepage preview
 * Shows the highest current streak to inspire users
 */
export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient()
    
    // Fetch top player by current streak
    const { data: topStreakData, error: streakError } = await adminClient
      .from('player_stats')
      .select('user_id, daily_streak, longest_streak, last_activity_date')
      .order('daily_streak', { ascending: false })
      .order('longest_streak', { ascending: false })
      .limit(1)
      .single()

    if (streakError) {
      console.error('❌ [STREAK PREVIEW] Error fetching top streak:', streakError)
      // Return demo data on error
      return NextResponse.json({
        success: true,
        currentStreak: 5,
        longestStreak: 12,
        isActiveToday: true,
        daysUntilBreak: 1
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60'
        }
      })
    }

    if (!topStreakData) {
      // No data yet - return demo values
      return NextResponse.json({
        success: true,
        currentStreak: 5,
        longestStreak: 12,
        isActiveToday: true,
        daysUntilBreak: 1
      })
    }

    // Check if streak is active today
    const today = new Date().toISOString().split('T')[0]
    const isActiveToday = topStreakData.last_activity_date === today

    // Calculate days until break (48-hour grace period)
    let daysUntilBreak = 2
    if (topStreakData.last_activity_date) {
      const lastActivity = new Date(topStreakData.last_activity_date)
      const todayDate = new Date(today)
      const daysSince = Math.floor((todayDate.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      daysUntilBreak = Math.max(0, 2 - daysSince)
    }

    // 🚀 OPTIMIZATION: Add caching headers for better performance
    return NextResponse.json({
      success: true,
      currentStreak: topStreakData.daily_streak || 0,
      longestStreak: topStreakData.longest_streak || 0,
      isActiveToday,
      daysUntilBreak
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    })

  } catch (error) {
    console.error('❌ [STREAK PREVIEW] Error:', error)
    // Return demo data on error
    return NextResponse.json({
      success: true,
      currentStreak: 5,
      longestStreak: 12,
      isActiveToday: true,
      daysUntilBreak: 1
    })
  }
}

