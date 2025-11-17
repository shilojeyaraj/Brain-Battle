"use client"

import { Suspense, useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { LobbySection } from "@/components/dashboard/lobby-section"
import { RecentBattles } from "@/components/dashboard/recent-battles"
import { Leaderboard } from "@/components/dashboard/leaderboard"
import { DashboardTutorial } from "@/components/tutorial/dashboard-tutorial"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, BarChart3 } from "lucide-react"
import dynamicImport from "next/dynamic"

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

const LazyRecentBattles = dynamicImport(() => import("@/components/dashboard/recent-battles").then(mod => ({ default: mod.RecentBattles })), {
  loading: () => (
    <div className="animate-pulse">
      <div className="h-8 bg-muted rounded mb-4"></div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded"></div>
        ))}
      </div>
    </div>
  )
})

export default function DashboardPage() {
  const [showStats, setShowStats] = useState(true)
  const [isTutorialActive, setIsTutorialActive] = useState(false)

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
          <DashboardTutorial />
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
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden mb-6 ${
            showStats ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <StatsGrid />
        </div>

        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-12">
            <LobbySection />
            <Suspense fallback={
              <div className="animate-pulse">
                <div className="h-8 bg-muted rounded mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted rounded"></div>
                  ))}
                </div>
              </div>
            }>
              <LazyRecentBattles />
            </Suspense>
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
