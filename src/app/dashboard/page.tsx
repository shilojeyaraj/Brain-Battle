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

  // Load saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dashboard_stats_collapsed')
    if (saved === 'true') {
      setShowStats(false)
    }
  }, [])

  const toggleStats = () => {
    const newState = !showStats
    setShowStats(newState)
    localStorage.setItem('dashboard_stats_collapsed', (!newState).toString())
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardTutorial />
      <DashboardHeader onToggleStats={toggleStats} showStats={showStats} />

      <main className="container mx-auto px-6 py-12">
        {/* Stats Toggle Button */}
        <div className="flex items-center justify-between mb-4">
          <Button
            onClick={toggleStats}
            className="bg-chart-5 hover:bg-chart-5/90 text-foreground font-black cartoon-border cartoon-shadow cartoon-hover"
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
  )
}
