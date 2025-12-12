"use client"

import { Suspense, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { LobbySection } from "@/components/dashboard/lobby-section"
import { RecentBattles } from "@/components/dashboard/recent-battles"
import { Leaderboard } from "@/components/dashboard/leaderboard"
import { ClansSection } from "@/components/clans/clans-section"
import { DashboardTutorial } from "@/components/tutorial/dashboard-tutorial"
import { SubscriptionBanner } from "@/components/dashboard/subscription-banner"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, BarChart3 } from "lucide-react"
import dynamicImport from "next/dynamic"
import { BrainBattleLoading } from "@/components/ui/brain-battle-loading"
import { getUserStatsClient, UserProfile } from "@/lib/actions/user-stats-client"

// Lazy load heavy components to improve initial page load
const LazyLeaderboard = dynamicImport(() => import("@/components/dashboard/leaderboard").then(mod => ({ default: mod.Leaderboard })), {
  loading: () => (
    <div className="animate-pulse">
      <div className="h-8 bg-muted rounded mb-4"></div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-muted rounded"></div>
        ))}
      </div>
    </div>
  )
})

export default function DashboardPage() {
  const router = useRouter()
  const [showStats, setShowStats] = useState(true)
  const [isTutorialActive, setIsTutorialActive] = useState(false)
  const [tutorialStep, setTutorialStep] = useState<number | undefined>(undefined)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userStats, setUserStats] = useState<UserProfile | null>(null)
  const [recentGames, setRecentGames] = useState<any[]>([])
  const [loadingStats, setLoadingStats] = useState(false)

  const [authError, setAuthError] = useState<string | null>(null)

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async (retryCount = 0) => {
      try {
        const { safeFetchJson } = await import('@/lib/utils/safe-fetch')
        const { data, error, response } = await safeFetchJson<{ success: boolean; userId?: string; error?: string; errorCode?: string }>('/api/user/current', {
          cache: 'no-store',
        })
        
        if (error || !data) {
          console.error('❌ [DASHBOARD] Failed to fetch user:', error)
          router.push('/login?error=' + encodeURIComponent(error || 'Server error. Please try again.'))
          return
        }
        
        if (!response.ok || response.status === 401) {
          // User is not authenticated - get error message and redirect to login with error
          const errorMessage = data?.error || 'Please log in to continue'
          const errorCode = data?.errorCode
          
          // Special handling for "logged in elsewhere" - show message before redirect
          if (errorCode === 'LOGGED_IN_ELSEWHERE') {
            setAuthError('You have been logged out because you logged in on another device. Please log in again.')
            // Wait a moment to show the message, then redirect
            setTimeout(() => {
              router.push(`/login?error=${encodeURIComponent(errorMessage)}`)
            }, 3000)
            return
          }
          
          // If coming from pricing page (newUser=true), retry a few times
          // The session cookie might not be immediately available after signup
          const searchParams = new URLSearchParams(window.location.search)
          const isNewUser = searchParams.get('newUser') === 'true'
          
          if (isNewUser && retryCount < 5) {
            console.log(`⏳ [DASHBOARD] New user - session not ready yet, retrying... (${retryCount + 1}/5)`)
            setTimeout(() => checkAuth(retryCount + 1), 500 * (retryCount + 1)) // Exponential backoff
            return
          }
          
          // For other errors or after retries, redirect immediately with error message
          router.push(`/login?error=${encodeURIComponent(errorMessage)}`)
          return
        }
        
        if (data?.success && data?.userId) {
          setIsAuthenticated(true)
          setUserId(data.userId)
          setAuthError(null)
        } else {
          // No user ID - redirect to login
          router.push('/login?error=' + encodeURIComponent('Please log in to continue'))
          return
        }
      } catch (error) {
        // Error checking auth - redirect to login
        console.error('❌ [DASHBOARD] Error checking authentication:', error)
        router.push('/login?error=' + encodeURIComponent('An error occurred. Please log in again.'))
        return
      } finally {
        setCheckingAuth(false)
      }
    }

    checkAuth()
  }, [router])

  // 🚀 OPTIMIZATION: Fetch user stats once at page level and share with components
  // FIXED: Remove loadingStats from deps to prevent infinite loop
  const fetchUserStats = useCallback(async (opts?: { force?: boolean }) => {
    if (!userId) return
    
    // Prevent concurrent fetches unless forced
    if (loadingStats && !opts?.force) return
    
    setLoadingStats(true)
    try {
      const result = await getUserStatsClient(userId, opts)
      if (result.success && result.data) {
        console.log('✅ [DASHBOARD PAGE] Stats fetched successfully')
        setUserStats(result.data)
        // Extract recent games from the stats data
        if (result.data.recentGames) {
          setRecentGames(result.data.recentGames)
        }
      } else {
        console.error('❌ [DASHBOARD PAGE] Failed to fetch stats:', result.error)
      }
    } catch (error) {
      console.error('❌ [DASHBOARD PAGE] Error fetching stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }, [userId]) // FIXED: Removed loadingStats from deps

  // Fetch stats once after authentication (force to avoid stale cache on nav)
  useEffect(() => {
    if (userId && isAuthenticated) {
      fetchUserStats({ force: true })
    }
  }, [userId, isAuthenticated, fetchUserStats])

  // Refresh once when a quiz completes (event-driven, not polling)
  useEffect(() => {
    const handleQuizComplete = () => {
      if (userId) {
        console.log('🔄 [DASHBOARD] quizCompleted event -> refreshing stats/recent battles')
        fetchUserStats({ force: true })
      }
    }
    window.addEventListener('quizCompleted', handleQuizComplete)
    return () => window.removeEventListener('quizCompleted', handleQuizComplete)
  }, [userId, fetchUserStats])

  // No repeated auto-refresh; rely on single fetch post-auth, quizCompleted event, and manual refresh buttons

  // Check if tutorial is active
  useEffect(() => {
    const checkTutorial = () => {
      const tutorialCompleted = localStorage.getItem('dashboard_tutorial_completed')
      const isNewUser = window.location.search.includes('newUser=true') || window.location.search.includes('userId=')
      setIsTutorialActive(!tutorialCompleted || isNewUser)
    }
    
    checkTutorial()
    // Check periodically in case tutorial state changes
    const interval = setInterval(checkTutorial, 500)
    return () => clearInterval(interval)
  }, [])

  // Load saved preference from localStorage (but force show during tutorial)
  useEffect(() => {
    // During tutorial, always show stats
    if (isTutorialActive) {
      setShowStats(true)
      return
    }
    
    const saved = localStorage.getItem('dashboard_stats_collapsed')
    if (saved === 'true') {
      setShowStats(false)
    }
  }, [isTutorialActive])

  const toggleStats = () => {
    // Don't allow hiding stats during tutorial
    if (isTutorialActive && showStats) {
      return
    }
    
    const newState = !showStats
    setShowStats(newState)
    localStorage.setItem('dashboard_stats_collapsed', (!newState).toString())
  }

  // Show loading state while checking authentication
  if (checkingAuth) {
    return <BrainBattleLoading message="Loading your dashboard..." />
  }

  // Don't render dashboard if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="relative z-10">
        <Suspense fallback={null}>
          <DashboardTutorial onStepChange={setTutorialStep} />
        </Suspense>
        <DashboardHeader onToggleStats={toggleStats} showStats={showStats} />

        <main className="container mx-auto px-6 py-12">
        {/* Stats Toggle Button */}
        <div className="flex items-center justify-between mb-4">
          <Button
            onClick={toggleStats}
            data-tutorial="show-stats-button"
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black border-2 border-orange-400"
          >
            <BarChart3 className="h-5 w-5 mr-2" strokeWidth={3} />
            {showStats ? 'Hide' : 'Show'} Stats
            {showStats ? (
              <ChevronUp className="h-5 w-5 ml-2" strokeWidth={3} />
            ) : (
              <ChevronDown className="h-5 w-5 ml-2" strokeWidth={3} />
            )}
          </Button>
        </div>

        {/* Collapsible Stats */}
        {showStats ? (
          <div className="mb-6">
            <StatsGrid
              userProfile={userStats}
              loading={loadingStats}
              refreshing={loadingStats}
              onRefresh={() => {
                if (userId) {
                  fetchUserStats()
                }
              }}
            />
          </div>
        ) : null}

        {/* Subscription Banner - Shows for free users */}
        <SubscriptionBanner />

        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-12">
            <LobbySection />
            
            <ClansSection />
            <RecentBattles
              recentGames={recentGames}
              loading={loadingStats}
              refreshing={loadingStats}
              onRefresh={() => {
                if (userId) {
                  fetchUserStats()
                }
              }}
            />
          </div>

          <div>
            <Suspense fallback={
              <div className="animate-pulse">
                <div className="h-8 bg-muted rounded mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded"></div>
                  ))}
                </div>
              </div>
            }>
              <LazyLeaderboard />
            </Suspense>
          </div>
        </div>
        </main>
      </div>
    </div>
  )
}
