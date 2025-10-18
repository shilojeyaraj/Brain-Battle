import { Suspense } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { LobbySection } from "@/components/dashboard/lobby-section"
import { RecentBattles } from "@/components/dashboard/recent-battles"
import { Leaderboard } from "@/components/dashboard/leaderboard"
import dynamic from "next/dynamic"

// Lazy load heavy components to improve initial page load
const LazyLeaderboard = dynamic(() => import("@/components/dashboard/leaderboard").then(mod => ({ default: mod.Leaderboard })), {
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

const LazyRecentBattles = dynamic(() => import("@/components/dashboard/recent-battles").then(mod => ({ default: mod.RecentBattles })), {
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
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-6 py-12 space-y-12">
        <StatsGrid />

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
