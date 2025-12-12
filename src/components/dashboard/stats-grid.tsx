"use client"

import { useState, useEffect, memo, useMemo, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Trophy, Target, Zap, Users, Loader2 } from "lucide-react"
import { getUserStatsClient, UserProfile } from "@/lib/actions/user-stats-client"
import { getCurrentUserId } from "@/lib/auth/session"
import { getRankFromXP, getRankIcon, formatXP } from "@/lib/rank-system"
import { CompactXPBar } from "@/components/ui/xp-progress-bar"

interface StatsGridProps {
  userProfile?: UserProfile | null
  loading?: boolean
  onRefresh?: () => void
  refreshing?: boolean
}

// 🚀 OPTIMIZATION: Memoize component to prevent unnecessary re-renders
// 🚀 OPTIMIZATION: Accept props to avoid redundant API calls
export const StatsGrid = memo(function StatsGrid({ userProfile: propUserProfile, loading: propLoading, onRefresh, refreshing }: StatsGridProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(propUserProfile || null)
  const [loading, setLoading] = useState(propLoading !== undefined ? propLoading : true)
  const [error, setError] = useState<string | null>(null)

  // Update local state when props change
  useEffect(() => {
    if (propUserProfile !== undefined) {
      setUserProfile(propUserProfile)
    }
  }, [propUserProfile])

  useEffect(() => {
    if (propLoading !== undefined) {
      setLoading(propLoading)
    }
  }, [propLoading])

  // Fallback: Only fetch if props not provided (for backwards compatibility)
  // FIXED: Remove propUserProfile from dependencies to prevent infinite loop
  const fetchUserStats = useCallback(async () => {
    if (propUserProfile !== undefined) {
      // Props provided, don't fetch
      return
    }
    
    setLoading(true)
    setError(null)
    try {
      // Try to get userId from session cookie first (more reliable)
      let userId: string | null = null
      try {
        const response = await fetch('/api/user/current', {
          credentials: 'include',
          cache: 'no-store'
        })
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.userId) {
            userId = data.userId
          }
        } else if (response.status === 401) {
          // User is not authenticated - redirect to login
          window.location.href = '/login'
          return
        }
      } catch (e) {
        console.warn('Failed to get userId from API, falling back to localStorage')
      }
      
      // Fallback to localStorage if API call failed
      if (!userId) {
        userId = await getCurrentUserId()
      }
      
      if (!userId) {
        // User is not authenticated - redirect to login
        window.location.href = '/login'
        return
      }

      // Add timestamp to bust cache
      const result = await getUserStatsClient(userId)
      if (result.success && result.data) {
        console.log('✅ [STATS GRID] Stats fetched successfully:', {
          xp: result.data.stats?.xp,
          level: result.data.stats?.level,
          total_games: result.data.stats?.total_games
        })
        setUserProfile(result.data)
      } else {
        // If error is due to authentication, redirect to login
        if (result.error?.includes('Unauthorized') || result.error?.includes('not authenticated')) {
          window.location.href = '/login'
          return
        }
        console.error('❌ [STATS GRID] Failed to fetch stats:', result.error)
        setError(result.error || "Failed to fetch stats")
      }
    } catch (err) {
      console.error("Error fetching user stats:", err)
      // Don't show error if user is not authenticated, just redirect
      setError("Failed to load stats")
    } finally {
      setLoading(false)
    }
  // FIXED: Remove propUserProfile from deps - check it inside the function instead
  }, [])

  // Only fetch if props not provided
  // FIXED: Only depend on propUserProfile, not fetchUserStats (prevents infinite loop)
  useEffect(() => {
    if (propUserProfile === undefined) {
      fetchUserStats()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propUserProfile])

  // Refresh stats when a quiz completes (event dispatched from battle page)
  // FIXED: Remove fetchUserStats from deps to prevent infinite loop
  useEffect(() => {
    if (propUserProfile !== undefined) return
    const handler = () => {
      fetchUserStats()
    }
    window.addEventListener('quizCompleted', handler as EventListener)
    return () => window.removeEventListener('quizCompleted', handler as EventListener)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propUserProfile])

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
          <Card key={i} className="p-6 bg-slate-700/50 border-4 border-slate-600/50 cartoon-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-600/50 flex items-center justify-center border-4 border-slate-500/50">
                <Loader2 className="w-6 h-6 text-white/70 animate-spin" strokeWidth={3} />
              </div>
              <div>
                <p className="text-sm text-white/70 font-bold">Loading...</p>
                <p className="text-2xl font-black text-white">-</p>
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
        <Card className="p-6 bg-slate-700/50 border-4 border-slate-600/50 cartoon-shadow md:col-span-2 lg:col-span-4">
          <div className="text-center">
            <p className="text-sm text-white/70 font-bold">Failed to load stats</p>
            <p className="text-white">{error || "User profile not found"}</p>
            {onRefresh && (
              <div className="mt-3">
                <button
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="px-3 py-2 rounded-lg border-2 border-blue-400 text-blue-100 hover:text-white hover:bg-blue-500/20 disabled:opacity-50 transition-colors font-bold text-sm"
                >
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>
    )
  }

  const { stats } = userProfile

  return (
    <div className="space-y-8" data-tutorial="stats-grid">
      <div className="flex justify-end">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="px-3 py-2 rounded-lg border-2 border-blue-400 text-blue-100 hover:text-white hover:bg-blue-500/20 disabled:opacity-50 transition-colors font-bold text-sm"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        )}
      </div>
      {/* XP Progress Bar */}
      <Card className="p-8 bg-slate-700/50 border-4 border-slate-600/50 cartoon-shadow">
        <CompactXPBar xp={stats.xp} />
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <Card className="p-8 bg-slate-700/50 border-4 border-slate-600/50 cartoon-shadow">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center border-4 border-orange-400/50">
              <Trophy className="w-8 h-8 text-white" strokeWidth={3} />
            </div>
            <div>
              <p className="text-base text-white/70 font-bold">Total Wins</p>
              <p className="text-3xl font-black text-white">{stats.total_wins}</p>
            </div>
          </div>
        </Card>

        <Card className="p-8 bg-slate-700/50 border-4 border-slate-600/50 cartoon-shadow">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border-4 border-blue-400/50">
              <Target className="w-8 h-8 text-white" strokeWidth={3} />
            </div>
            <div>
              <p className="text-base text-white/70 font-bold">Accuracy</p>
              <p className="text-3xl font-black text-white">{stats.accuracy.toFixed(1)}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-8 bg-slate-700/50 border-4 border-slate-600/50 cartoon-shadow">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center border-4 border-orange-400/50">
              <Zap className="w-8 h-8 text-white" strokeWidth={3} />
            </div>
            <div>
              <p className="text-base text-white/70 font-bold">Win Streak</p>
              <p className="text-3xl font-black text-white">{stats.win_streak}</p>
            </div>
          </div>
        </Card>

        <Card className="p-8 bg-slate-700/50 border-4 border-slate-600/50 cartoon-shadow">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border-4 border-blue-400/50">
              <Users className="w-8 h-8 text-white" strokeWidth={3} />
            </div>
            <div>
              <p className="text-base text-white/70 font-bold">Total Games</p>
              <p className="text-3xl font-black text-white">{stats.total_games}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="p-8 bg-slate-700/50 border-4 border-slate-600/50 cartoon-shadow">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              {getRankIcon(rank, "h-8 w-8")}
              <p className="text-base text-white/70 font-bold">Current Rank</p>
            </div>
            <p className="text-2xl font-black text-white">{rank.name}</p>
            <p className="text-sm text-white/70">Level {stats.level}</p>
          </div>
        </Card>

        <Card className="p-8 bg-slate-700/50 border-4 border-slate-600/50 cartoon-shadow">
          <div className="text-center">
            <p className="text-base text-white/70 font-bold mb-3">Win Rate</p>
            <p className="text-2xl font-black text-white">{winRate.toFixed(1)}%</p>
            <p className="text-sm text-white/70">{stats.total_wins}/{stats.total_games} games</p>
          </div>
        </Card>

        <Card className="p-8 bg-slate-700/50 border-4 border-slate-600/50 cartoon-shadow">
          <div className="text-center">
            <p className="text-base text-white/70 font-bold mb-3">Questions Answered</p>
            <p className="text-2xl font-black text-white">{stats.total_questions_answered}</p>
            <p className="text-sm text-white/70">{stats.correct_answers} correct</p>
          </div>
        </Card>
      </div>
    </div>
  )
})