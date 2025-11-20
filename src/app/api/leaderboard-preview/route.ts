import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'

/**
 * API route to fetch top 3 players for homepage leaderboard preview
 * Uses admin client to bypass RLS since custom auth doesn't set auth.uid()
 */
export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient()
    
    // Fetch top 3 players by XP, including previous_rank for trend calculation
    const { data: playersData, error: playersError } = await adminClient
      .from('player_stats')
      .select('user_id, level, xp, total_wins, total_games, previous_rank')
      .order('xp', { ascending: false })
      .order('total_games', { ascending: false }) // Secondary sort
      .limit(3)

    if (playersError) {
      console.error('❌ [LEADERBOARD PREVIEW] Error fetching players:', playersError)
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      )
    }

    if (!playersData || playersData.length === 0) {
      return NextResponse.json({
        success: true,
        players: []
      })
    }

    // Fetch profiles for these users
    const userIds = playersData.map(p => p.user_id)
    const { data: profilesData, error: profilesError } = await adminClient
      .from('profiles')
      .select('user_id, username, avatar_url')
      .in('user_id', userIds)

    if (profilesError) {
      console.warn('⚠️ [LEADERBOARD PREVIEW] Error fetching profiles:', profilesError)
      // Continue without profiles - use fallback values
    }

    // Create a map of user_id to profile data
    const profilesMap = new Map(
      (profilesData || []).map(p => [p.user_id, { username: p.username || 'Unknown', avatar_url: p.avatar_url }])
    )

    // Combine data and add rank numbers
    const players = playersData.map((player, index) => {
      const profile = profilesMap.get(player.user_id)
      
      return {
        rank: index + 1,
        user_id: player.user_id,
        username: profile?.username || 'Unknown',
        xp: player.xp,
        level: player.level,
        wins: player.total_wins || 0,
        avatar_url: profile?.avatar_url
      }
    })

    // Determine trends based on actual previous_rank from database
    const playersWithTrends = players.map((player, index) => {
      const currentRank = index + 1
      const playerData = playersData[index]
      const previousRank = playerData?.previous_rank
      
      let trend: 'up' | 'down' | 'stable' = 'stable'
      
      if (previousRank !== null && previousRank !== undefined) {
        if (previousRank > currentRank) {
          trend = 'up' // Rank improved (lower number = better)
        } else if (previousRank < currentRank) {
          trend = 'down' // Rank worsened
        } else {
          trend = 'stable' // Rank unchanged
        }
      } else {
        // No previous rank data - default to stable for new players
        trend = 'stable'
      }
      
      return {
        ...player,
        trend
      }
    })

    return NextResponse.json({
      success: true,
      players: playersWithTrends
    })

  } catch (error) {
    console.error('❌ [LEADERBOARD PREVIEW] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

