import { Card } from "@/components/ui/card"
import { Trophy, Target, Zap, Users } from "lucide-react"

export function StatsGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="p-6 bg-card cartoon-border cartoon-shadow">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center cartoon-border cartoon-shadow">
            <Trophy className="w-6 h-6 text-primary-foreground" strokeWidth={3} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-bold">Total Wins</p>
            <p className="text-2xl font-black text-foreground">0</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-card cartoon-border cartoon-shadow">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center cartoon-border cartoon-shadow">
            <Target className="w-6 h-6 text-secondary-foreground" strokeWidth={3} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-bold">Accuracy</p>
            <p className="text-2xl font-black text-foreground">0%</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-card cartoon-border cartoon-shadow">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-chart-3 flex items-center justify-center cartoon-border cartoon-shadow">
            <Zap className="w-6 h-6 text-foreground" strokeWidth={3} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-bold">Streak</p>
            <p className="text-2xl font-black text-foreground">0</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-card cartoon-border cartoon-shadow">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center cartoon-border cartoon-shadow">
            <Users className="w-6 h-6 text-accent-foreground" strokeWidth={3} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-bold">Battles</p>
            <p className="text-2xl font-black text-foreground">0</p>
          </div>
        </div>
      </Card>
    </div>
  )
}