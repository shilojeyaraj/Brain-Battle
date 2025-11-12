"use client"

import { useState, useEffect, memo, useMemo, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Trophy, Target, Zap, Users, Loader2 } from "lucide-react"
import { getUserStatsClient, UserProfile } from "@/lib/actions/user-stats-client"
import { getCurrentUserId } from "@/lib/auth/session"
import { getRankFromXP, getRankIcon, formatXP } from "@/lib/rank-system"
import { CompactXPBar } from "@/components/ui/xp-progress-bar"

// 🚀 OPTIMIZATION: Memoize component to prevent unnecessary re-renders
export const StatsGrid = memo(function StatsGrid() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUserStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const userId = await getCurrentUserId()
      if (!userId) {
        setError("User not authenticated")
        setLoading(false)
        return
      }

      const result = await getUserStatsClient(userId)
      if (result.success && result.data) {
        setUserProfile(result.data)
      } else {
        setError(result.error || "Failed to fetch stats")
      }
    } catch (err) {
      console.error("Error fetching user stats:", err)
      setError("Failed to load stats")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUserStats()
    
    // Refresh stats when page becomes visible (user returns to dashboard)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUserStats()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchUserStats])

  // 🚀 OPTIMIZATION: Memoize expensive calculations
  // Must be called unconditionally (before any early returns) to follow Rules of Hooks
  const rank = useMemo(() => {
    if (!userProfile?.stats) return getRankFromXP(0)
    return getRankFromXP(userProfile.stats.xp)
  }, [userProfile?.stats?.xp])
  
  const winRate = useMemo(() => {
    if (!userProfile?.stats) return 0
    return userProfile.stats.total_games > 0 
      ? (userProfile.stats.total_wins / userProfile.stats.total_games * 100) 
      : 0
  }, [userProfile?.stats?.total_wins, userProfile?.stats?.total_games])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6 bg-card cartoon-border cartoon-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center cartoon-border cartoon-shadow">
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" strokeWidth={3} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-bold">Loading...</p>
                <p className="text-2xl font-black text-foreground">-</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !userProfile) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-card cartoon-border cartoon-shadow md:col-span-2 lg:col-span-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground font-bold">Failed to load stats</p>
            <p className="text-foreground">{error || "User profile not found"}</p>
          </div>
        </Card>
      </div>
    )
  }

  const { stats } = userProfile

  return (
    <div className="space-y-8" data-tutorial="stats-grid">
      {/* XP Progress Bar */}
      <Card className="p-8 bg-card cartoon-border cartoon-shadow">
        <CompactXPBar xp={stats.xp} />
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <Card className="p-8 bg-card cartoon-border cartoon-shadow">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center cartoon-border cartoon-shadow">
              <Trophy className="w-8 h-8 text-primary-foreground" strokeWidth={3} />
            </div>
            <div>
              <p className="text-base text-muted-foreground font-bold">Total Wins</p>
              <p className="text-3xl font-black text-foreground">{stats.total_wins}</p>
            </div>
          </div>
        </Card>

        <Card className="p-8 bg-card cartoon-border cartoon-shadow">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center cartoon-border cartoon-shadow">
              <Target className="w-8 h-8 text-secondary-foreground" strokeWidth={3} />
            </div>
            <div>
              <p className="text-base text-muted-foreground font-bold">Accuracy</p>
              <p className="text-3xl font-black text-foreground">{stats.accuracy.toFixed(1)}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-8 bg-card cartoon-border cartoon-shadow">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-xl bg-chart-3 flex items-center justify-center cartoon-border cartoon-shadow">
              <Zap className="w-8 h-8 text-foreground" strokeWidth={3} />
            </div>
            <div>
              <p className="text-base text-muted-foreground font-bold">Win Streak</p>
              <p className="text-3xl font-black text-foreground">{stats.win_streak}</p>
            </div>
          </div>
        </Card>

        <Card className="p-8 bg-card cartoon-border cartoon-shadow">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-xl bg-accent flex items-center justify-center cartoon-border cartoon-shadow">
              <Users className="w-8 h-8 text-accent-foreground" strokeWidth={3} />
            </div>
            <div>
              <p className="text-base text-muted-foreground font-bold">Total Games</p>
              <p className="text-3xl font-black text-foreground">{stats.total_games}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="p-8 bg-card cartoon-border cartoon-shadow">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              {getRankIcon(rank, "h-8 w-8")}
              <p className="text-base text-muted-foreground font-bold">Current Rank</p>
            </div>
            <p className="text-2xl font-black text-foreground">{rank.name}</p>
            <p className="text-sm text-muted-foreground">Level {stats.level}</p>
          </div>
        </Card>

        <Card className="p-8 bg-card cartoon-border cartoon-shadow">
          <div className="text-center">
            <p className="text-base text-muted-foreground font-bold mb-3">Win Rate</p>
            <p className="text-2xl font-black text-foreground">{winRate.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground">{stats.total_wins}/{stats.total_games} games</p>
          </div>
        </Card>

        <Card className="p-8 bg-card cartoon-border cartoon-shadow">
          <div className="text-center">
            <p className="text-base text-muted-foreground font-bold mb-3">Questions Answered</p>
            <p className="text-2xl font-black text-foreground">{stats.total_questions_answered}</p>
            <p className="text-sm text-muted-foreground">{stats.correct_answers} correct</p>
          </div>
        </Card>
      </div>
    </div>
  )
})