import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { LobbySection } from "@/components/dashboard/lobby-section"
import { RecentBattles } from "@/components/dashboard/recent-battles"
import { Leaderboard } from "@/components/dashboard/leaderboard"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8 space-y-8">
        <StatsGrid />

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <LobbySection />
            <RecentBattles />
          </div>

          <div>
            <Leaderboard />
          </div>
        </div>
      </main>
    </div>
  )
}
