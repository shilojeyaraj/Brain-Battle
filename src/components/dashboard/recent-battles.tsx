import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Clock, Users, Target } from "lucide-react"

const recentBattles = [
  // Empty array for new users - no battles yet!
]

export function RecentBattles() {
  return (
    <Card className="p-6 bg-card cartoon-border cartoon-shadow">
      <div className="mb-6">
        <h2 className="text-3xl font-black text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>
          Recent Battles
        </h2>
        <p className="text-sm text-muted-foreground font-bold">Your latest showdowns</p>
      </div>

      <div className="space-y-4">
        {recentBattles.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4 cartoon-border">
              <Trophy className="w-8 h-8 text-muted-foreground" strokeWidth={3} />
            </div>
            <h3 className="text-lg font-black text-foreground mb-2">No battles yet!</h3>
            <p className="text-muted-foreground font-bold">Join a lobby to start your first battle and see your results here.</p>
          </div>
        ) : (
          recentBattles.map((battle) => (
          <div
            key={battle.id}
            className="p-4 rounded-xl border-4 bg-card cartoon-border cartoon-shadow cartoon-hover"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center cartoon-border">
                  {battle.result === "Won" ? (
                    <Trophy className="w-5 h-5 text-chart-3" strokeWidth={3} />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-destructive" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-foreground text-lg">{battle.name}</h3>
                  <p className="text-sm text-muted-foreground font-bold">{battle.subject}</p>
                </div>
              </div>
              <Badge
                className={`cartoon-border font-black ${
                  battle.result === "Won"
                    ? "bg-chart-3 text-foreground"
                    : "bg-destructive text-destructive-foreground"
                }`}
              >
                {battle.result}
              </Badge>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" strokeWidth={3} />
                <span className="text-muted-foreground font-bold">Score:</span>
                <span className="font-black text-foreground">{battle.score}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-secondary" strokeWidth={3} />
                <span className="text-muted-foreground font-bold">Time:</span>
                <span className="font-black text-foreground">{battle.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-chart-3" strokeWidth={3} />
                <span className="text-muted-foreground font-bold">Players:</span>
                <span className="font-black text-foreground">{battle.players}</span>
              </div>
              <div className="ml-auto">
                <span className="text-muted-foreground font-bold">{battle.date}</span>
              </div>
            </div>
          </div>
          ))
        )}
      </div>
    </Card>
  )
}