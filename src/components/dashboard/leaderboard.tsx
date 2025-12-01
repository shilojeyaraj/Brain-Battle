"use client"

import { useState, useEffect, useCallback, memo } from "react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { TrendingUp, Crown, Users, Loader2, RefreshCw, Search, X } from "lucide-react"
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

const Leaderboard = memo(function Leaderboard() {
  const [topPlayers, setTopPlayers] = useState<LeaderboardPlayer[]>([])
  const [allPlayers, setAllPlayers] = useState<LeaderboardPlayer[]>([]) // Store all players for search
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardPlayer | null>(null)
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const fetchLeaderboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const supabase = createClient()
      const currentUserId = await getCurrentUserId()

      // Fetch top 5 players with stats
      const { data: playersData, error: playersError } = await supabase
        .from('player_stats')
        .select('user_id, level, xp, total_wins, total_games')
        .order('xp', { ascending: false })
        .order('total_games', { ascending: false }) // Secondary sort by games played
        .limit(5)

      if (playersError) {
        const errorDetails = {
          code: playersError.code,
          message: playersError.message,
          details: playersError.details,
          hint: playersError.hint,
          errorKeys: Object.keys(playersError),
          fullError: playersError
        }
        console.error('Error fetching players with stats:', errorDetails)
        setError('Failed to load leaderboard')
        return
      }

      // Fetch profiles separately and join in code (more reliable than database join)
      const userIds = playersData?.map(p => p.user_id) || []
      let profilesMap = new Map<string, { username: string; avatar_url?: string }>()
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', userIds)

        if (profilesError) {
          console.warn('Error fetching profiles for leaderboard:', profilesError)
          // Continue without profiles - we'll use fallback values
        } else {
          profilesMap = new Map(
            profilesData?.map(p => [p.user_id, { username: p.username || 'Unknown', avatar_url: p.avatar_url }]) || []
          )
        }
      }

      // Get current user's rank if they're not in top 10
      let userRank = null
      if (currentUserId) {
        const { data: userStatsData, error: userStatsError } = await supabase
          .from('player_stats')
          .select('user_id, level, xp, total_wins, total_games')
          .eq('user_id', currentUserId)
          .single()

        if (!userStatsError && userStatsData) {
          // Get their rank by counting players with higher XP
          let rankCount = 0
          try {
            const { count: higherXpCount } = await supabase
              .from('player_stats')
              .select('*', { count: 'exact', head: true })
              .gt('xp', userStatsData.xp)
            rankCount = higherXpCount || 0
            
            // Also count players with same XP but more games
            const { count: sameXpMoreGames } = await supabase
              .from('player_stats')
              .select('*', { count: 'exact', head: true })
              .eq('xp', userStatsData.xp)
              .gt('total_games', userStatsData.total_games || 0)
            rankCount += (sameXpMoreGames || 0)
          } catch (rankError) {
            console.warn('Error calculating rank:', rankError)
            // Fallback: just use XP-based ranking
            const { count: simpleCount } = await supabase
              .from('player_stats')
              .select('*', { count: 'exact', head: true })
              .gt('xp', userStatsData.xp)
            rankCount = simpleCount || 0
          }

          // Fetch user's profile separately
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('user_id', currentUserId)
            .single()
          
          userRank = {
            rank: rankCount + 1,
            user_id: userStatsData.user_id,
            username: userProfile?.username || 'Unknown',
            level: userStatsData.level,
            xp: userStatsData.xp,
            wins: userStatsData.total_wins,
            avatar_url: userProfile?.avatar_url
          }
        }
      }

      // Get total count of all players with stats
      const { count: totalCount, error: countError } = await supabase
        .from('player_stats')
        .select('*', { count: 'exact', head: true })

      if (countError) {
        console.error('Error fetching total count:', countError)
      }

      // Transform data and add rank numbers
      // Join with profiles data we fetched separately
      const playersWithRank = playersData?.map((player, index) => {
        const profile = profilesMap.get(player.user_id)
        
        return {
          rank: index + 1,
          user_id: player.user_id,
          username: profile?.username || 'Unknown',
          level: player.level,
          xp: player.xp,
          wins: player.total_wins,
          avatar_url: profile?.avatar_url
        }
      }) || []

      // Fetch all players for search functionality
      const { data: allPlayersData, error: allPlayersError } = await supabase
        .from('player_stats')
        .select('user_id, level, xp, total_wins, total_games')
        .order('xp', { ascending: false })
        .order('total_games', { ascending: false })

      if (!allPlayersError && allPlayersData) {
        const allUserIds = allPlayersData.map(p => p.user_id)
        const { data: allProfilesData } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', allUserIds)

        const allProfilesMap = new Map(
          (allProfilesData || []).map(p => [p.user_id, { username: p.username || 'Unknown', avatar_url: p.avatar_url }])
        )

        // Calculate ranks for all players
        const allPlayersWithRank = allPlayersData.map((player, index) => {
          const profile = allProfilesMap.get(player.user_id)
          return {
            rank: index + 1,
            user_id: player.user_id,
            username: profile?.username || 'Unknown',
            level: player.level,
            xp: player.xp,
            wins: player.total_wins,
            avatar_url: profile?.avatar_url
          }
        })

        setAllPlayers(allPlayersWithRank)
      }

      setTopPlayers(playersWithRank)
      // Only set currentUserRank if they're not in top 5
      if (userRank && userRank.rank > 5) {
        setCurrentUserRank(userRank)
      } else {
        setCurrentUserRank(null)
      }
      setTotalPlayers(totalCount || 0)

    } catch (err) {
      console.error('Error in fetchLeaderboard:', err)
      setError('Failed to load leaderboard data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchLeaderboard()

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchLeaderboard(true)
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchLeaderboard])

  const handleRefresh = useCallback(() => {
    fetchLeaderboard(true)
  }, [fetchLeaderboard])

  if (loading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg sticky top-24">
        <div className="flex items-center gap-2 mb-6">
          <Crown className="h-6 w-6 text-blue-400" strokeWidth={3} />
          <h2 className="text-3xl font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
            Leaderboard
          </h2>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-700/50 border-4 border-slate-600/50 shadow-lg">
              <div className="w-10 h-10 bg-slate-600/50 rounded-full flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-blue-300/50 animate-spin" />
              </div>
              <div className="flex-1">
                <div className="h-4 bg-slate-600/50 rounded w-24 mb-2"></div>
                <div className="h-3 bg-slate-600/50 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg sticky top-24">
        <div className="text-center">
          <p className="text-sm text-blue-100/70 font-bold">Failed to load leaderboard</p>
          <p className="text-white mb-4">{error}</p>
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
    <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg sticky top-24" data-tutorial="leaderboard">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-blue-400" strokeWidth={3} />
          <h2 className="text-3xl font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
            Leaderboard
          </h2>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50 text-blue-100/70 hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-100/70" />
        <Input
          type="text"
          placeholder="Search by username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10 bg-slate-700/50 border-4 border-slate-600/50 text-white placeholder:text-blue-100/50 font-bold focus:border-blue-400/50"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-600/50 rounded transition-colors"
          >
            <X className="h-4 w-4 text-blue-100/70" />
          </button>
        )}
      </div>

      <div className="space-y-6">
        {(() => {
          // Filter players based on search query
          let displayPlayers = topPlayers
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim()
            displayPlayers = allPlayers.filter(p => 
              p.username.toLowerCase().includes(query)
            )
          } else {
            // Show top 5, then current user if not in top 5
            displayPlayers = topPlayers
          }

          if (displayPlayers.length === 0) {
            return (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-blue-300/50 mx-auto mb-4" strokeWidth={1} />
                <h3 className="text-lg font-bold text-white mb-2">
                  {searchQuery ? "No players found" : "No Players Yet"}
                </h3>
                <p className="text-sm text-blue-100/70">
                  {searchQuery 
                    ? `No players match "${searchQuery}"`
                    : "Be the first to complete a battle and appear on the leaderboard!"}
                </p>
              </div>
            )
          }

          return (
            <>
              {displayPlayers.map((player, index) => {
            const rank = getRankFromXP(player.xp)
            const isCurrentUser = currentUserRank?.user_id === player.user_id
            
            return (
              <div key={player.rank}>
                <div
                  className={`p-6 rounded-xl border-4 transition-all duration-300 shadow-lg ${
                    player.rank === 1
                      ? "bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-400/50"
                      : player.rank === 2
                      ? "bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-orange-400/50"
                      : player.rank === 3
                      ? "bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-400/50"
                      : isCurrentUser
                      ? "bg-gradient-to-br from-slate-700/50 to-slate-800/50 border-blue-400/50"
                      : "bg-gradient-to-br from-slate-700/50 to-slate-800/50 border-slate-600/50 hover:border-blue-400/50"
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div
                        className={`text-2xl font-black w-12 h-12 rounded-full flex items-center justify-center border-4 ${
                          player.rank === 1
                            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-400"
                            : player.rank === 2
                            ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white border-orange-400"
                            : player.rank === 3
                            ? "bg-gradient-to-br from-green-500 to-green-600 text-white border-green-400"
                            : "bg-gradient-to-br from-slate-600 to-slate-700 text-blue-100/70 border-slate-500/50"
                        }`}
                      >
                        {player.rank}
                      </div>
                      {player.rank === 1 && (
                        <Crown className="absolute -top-2 -right-2 h-6 w-6 text-blue-400" strokeWidth={3} />
                      )}
                    </div>

                    <Avatar className="h-14 w-14 border-4 border-slate-600/50">
                      <AvatarImage src={player.avatar_url || "/placeholder.svg"} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 text-blue-300 border-2 border-blue-400/50 font-black">
                        {player.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <p className="font-black text-white truncate text-xl">{player.username}</p>
                        {isCurrentUser && (
                          <Badge className="bg-blue-500/20 text-blue-300 border-2 border-blue-400/50 text-sm px-2 py-1">You</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-base text-blue-100/70 font-bold">
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
                
                {/* Show current user right after 5th player if not in top 5 and not searching */}
                {!searchQuery && index === 4 && currentUserRank && currentUserRank.rank > 5 && (
                  <div className="mt-4 pt-4 border-t-4 border-slate-600/50">
                    <div
                      className="p-6 rounded-xl border-4 bg-gradient-to-br from-slate-700/50 to-slate-800/50 border-blue-400/50 shadow-lg"
                    >
                      <div className="flex items-center gap-6">
                        <div className="relative">
                          <div className="text-2xl font-black w-12 h-12 rounded-full flex items-center justify-center border-4 bg-gradient-to-br from-blue-500/20 to-blue-600/20 text-blue-300 border-blue-400/50">
                            {currentUserRank.rank}
                          </div>
                        </div>

                        <Avatar className="h-14 w-14 border-4 border-blue-400/50">
                          <AvatarImage src={currentUserRank.avatar_url || "/placeholder.svg"} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 text-blue-300 border-2 border-blue-400/50 font-black">
                            {currentUserRank.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <p className="font-black text-white truncate text-xl">{currentUserRank.username}</p>
                            <Badge className="bg-blue-500/20 text-blue-300 border-2 border-blue-400/50 text-sm px-2 py-1">You</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-base text-blue-100/70 font-bold">
                            <span>{formatXP(currentUserRank.xp)} XP</span>
                            <span>•</span>
                            <span>{currentUserRank.wins} wins</span>
                            <span>•</span>
                            <div className="flex items-center gap-2">
                              {getRankIcon(getRankFromXP(currentUserRank.xp), "h-4 w-4")}
                              <span>{getRankFromXP(currentUserRank.xp).name}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
            </>
          )
        })()}
      </div>


      <div className="mt-6 p-6 rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 border-4 border-slate-600/50 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-orange-400" strokeWidth={3} />
            <span className="text-sm text-blue-100/70 font-bold">Total Players</span>
          </div>
          <Badge className="bg-orange-500/20 text-orange-300 border-2 border-orange-400/50 font-black">
            {totalPlayers.toLocaleString()}
          </Badge>
        </div>
      </div>
    </Card>
  )
})

export { Leaderboard }