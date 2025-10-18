"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Crown, Users, Loader2, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getCurrentUserId } from "@/lib/auth/session"
import { getRankFromXP, getRankIcon, formatXP } from "@/lib/rank-system"

interface LeaderboardPlayer {
  rank: number
  user_id: string
  username: string
  level: number
  xp: number
  wins: number
  avatar_url?: string
}

export function Leaderboard() {
  const [topPlayers, setTopPlayers] = useState<LeaderboardPlayer[]>([])
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardPlayer | null>(null)
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaderboard = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const supabase = createClient()
      const currentUserId = getCurrentUserId()

      // Fetch players with actual game statistics (played at least one game)
      const { data: playersData, error: playersError } = await supabase
        .from('player_stats')
        .select(`
          user_id,
          level,
          xp,
          total_wins,
          total_games,
          users!inner(username, avatar_url)
        `)
        .gt('total_games', 0) // Only players who have played at least one game
        .order('xp', { ascending: false })
        .limit(10)

      if (playersError) {
        console.error('Error fetching players with stats:', playersError)
        setError('Failed to load leaderboard')
        return
      }

      // Get current user's rank if they're not in top 10
      let userRank = null
      if (currentUserId) {
        const { data: userStatsData, error: userStatsError } = await supabase
          .from('player_stats')
          .select(`
            user_id,
            level,
            xp,
            total_wins,
            total_games,
            users!inner(username, avatar_url)
          `)
          .eq('user_id', currentUserId)
          .gt('total_games', 0) // Only if they have played games
          .single()

        if (!userStatsError && userStatsData) {
          // Get their rank by counting players with higher XP
          const { count: higherXpCount } = await supabase
            .from('player_stats')
            .select('*', { count: 'exact', head: true })
            .gt('xp', userStatsData.xp)
            .gt('total_games', 0)

          userRank = {
            rank: (higherXpCount || 0) + 1,
            user_id: userStatsData.user_id,
            username: userStatsData.users.username,
            level: userStatsData.level,
            xp: userStatsData.xp,
            wins: userStatsData.total_wins,
            avatar_url: userStatsData.users.avatar_url
          }
        }
      }

      // Get total count of players who have played games
      const { count: totalCount, error: countError } = await supabase
        .from('player_stats')
        .select('*', { count: 'exact', head: true })
        .gt('total_games', 0) // Only count players who have played games

      if (countError) {
        console.error('Error fetching total count:', countError)
      }

      // Transform data and add rank numbers
      const playersWithRank = playersData?.map((player, index) => ({
        rank: index + 1,
        user_id: player.user_id,
        username: player.users.username,
        level: player.level,
        xp: player.xp,
        wins: player.total_wins,
        avatar_url: player.users.avatar_url
      })) || []

      setTopPlayers(playersWithRank)
      setCurrentUserRank(userRank)
      setTotalPlayers(totalCount || 0)

    } catch (err) {
      console.error('Error in fetchLeaderboard:', err)
      setError('Failed to load leaderboard data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchLeaderboard(true)
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    fetchLeaderboard(true)
  }

  if (loading) {
    return (
      <Card className="p-6 bg-card cartoon-border cartoon-shadow sticky top-24">
        <div className="flex items-center gap-2 mb-6">
          <Crown className="h-6 w-6 text-primary" strokeWidth={3} />
          <h2 className="text-3xl font-black text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Leaderboard
          </h2>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 cartoon-border cartoon-shadow">
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
              </div>
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                <div className="h-3 bg-muted rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6 bg-card cartoon-border cartoon-shadow sticky top-24">
        <div className="text-center">
          <p className="text-sm text-muted-foreground font-bold">Failed to load leaderboard</p>
          <p className="text-foreground mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 bg-card cartoon-border cartoon-shadow sticky top-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-primary" strokeWidth={3} />
          <h2 className="text-3xl font-black text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Leaderboard
          </h2>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-6">
        {topPlayers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" strokeWidth={1} />
            <h3 className="text-lg font-bold text-foreground mb-2">No Players Yet</h3>
            <p className="text-sm text-muted-foreground">
              Be the first to complete a battle and appear on the leaderboard!
            </p>
          </div>
        ) : (
          topPlayers.map((player) => {
          const rank = getRankFromXP(player.xp)
          const isCurrentUser = currentUserRank?.user_id === player.user_id
          
          return (
            <div
              key={player.rank}
              className={`p-6 rounded-xl border-4 transition-all duration-300 cartoon-hover ${
                player.rank === 1
                  ? "bg-primary/10 border-primary cartoon-shadow"
                  : player.rank === 2
                  ? "bg-accent/10 border-accent cartoon-shadow"
                  : player.rank === 3
                  ? "bg-chart-3/10 border-chart-3 cartoon-shadow"
                  : isCurrentUser
                  ? "bg-secondary/30 border-secondary"
                  : "bg-secondary/30 border-border hover:border-primary"
              }`}
            >
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div
                    className={`text-2xl font-black w-12 h-12 rounded-full flex items-center justify-center cartoon-border ${
                      player.rank === 1
                        ? "bg-primary text-primary-foreground"
                        : player.rank === 2
                        ? "bg-accent text-accent-foreground"
                        : player.rank === 3
                        ? "bg-chart-3 text-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {player.rank}
                  </div>
                  {player.rank === 1 && (
                    <Crown className="absolute -top-2 -right-2 h-6 w-6 text-primary" strokeWidth={3} />
                  )}
                </div>

                <Avatar className="h-14 w-14 cartoon-border">
                  <AvatarImage src={player.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground font-black">
                    {player.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="font-black text-foreground truncate text-xl">{player.username}</p>
                    {isCurrentUser && (
                      <Badge className="bg-secondary text-secondary-foreground text-sm px-2 py-1">You</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-base text-muted-foreground font-bold">
                    <span>{formatXP(player.xp)} XP</span>
                    <span>•</span>
                    <span>{player.wins} wins</span>
                    <span>•</span>
                    <div className="flex items-center gap-2">
                      {getRankIcon(rank, "h-4 w-4")}
                      <span>{rank.name}</span>
                    </div>
                  </div>
                </div>

                {player.rank <= 3 && (
                  <TrendingUp className="h-6 w-6 text-chart-3" strokeWidth={3} />
                )}
              </div>
            </div>
          )
        })
        }
      </div>

      {/* Show current user's rank if not in top 10 */}
      {currentUserRank && currentUserRank.rank > 10 && (
        <div className="mt-4 p-4 rounded-xl bg-secondary/20 border-2 border-secondary/40 cartoon-border">
          <div className="flex items-center gap-4">
            <div className="text-lg font-black w-8 h-8 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground">
              {currentUserRank.rank}
            </div>
            <div className="flex-1">
              <p className="font-bold text-foreground">Your Rank</p>
              <p className="text-sm text-muted-foreground">
                {formatXP(currentUserRank.xp)} XP • {currentUserRank.wins} wins
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 p-6 rounded-xl bg-secondary/50 cartoon-border cartoon-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-secondary" strokeWidth={3} />
            <span className="text-sm text-muted-foreground font-bold">Total Players</span>
          </div>
          <Badge className="bg-secondary text-secondary-foreground font-black">
            {totalPlayers.toLocaleString()}
          </Badge>
        </div>
      </div>
    </Card>
  )
}