import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Crown, TrendingUp } from "lucide-react"

const topPlayers = [
  {
    rank: 1,
    name: "BrainMaster",
    xp: 45280,
    wins: 342,
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    rank: 2,
    name: "StudyWarrior",
    xp: 42150,
    wins: 318,
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    rank: 3,
    name: "QuizKing",
    xp: 39870,
    wins: 295,
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    rank: 4,
    name: "MindBattler",
    xp: 35420,
    wins: 267,
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    rank: 5,
    name: "AcademicAce",
    xp: 32190,
    wins: 241,
    avatar: "/placeholder.svg?height=40&width=40",
  },
]

export function Leaderboard() {
  return (
    <Card className="p-6 bg-card cartoon-border cartoon-shadow sticky top-24">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Crown className="h-6 w-6 text-primary" strokeWidth={3} />
          <h2 className="text-3xl font-black text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Leaderboard
          </h2>
        </div>
        <p className="text-sm text-muted-foreground font-bold">Top warriors this season</p>
      </div>

      <div className="space-y-4">
        {topPlayers.map((player) => (
          <div
            key={player.rank}
            className={`p-4 rounded-xl border-4 transition-all duration-300 cartoon-hover ${
              player.rank === 1
                ? "bg-primary/10 border-primary cartoon-shadow"
                : player.rank === 2
                ? "bg-accent/10 border-accent cartoon-shadow"
                : player.rank === 3
                ? "bg-chart-3/10 border-chart-3 cartoon-shadow"
                : "bg-secondary/30 border-border hover:border-primary"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div
                  className={`text-xl font-black w-10 h-10 rounded-full flex items-center justify-center cartoon-border ${
                    player.rank === 1
                      ? "bg-primary text-primary-foreground"
                      : player.rank === 2
                      ? "bg-accent text-accent-foreground"
                      : player.rank === 3
                      ? "bg-chart-3 text-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {player.rank}
                </div>
                {player.rank === 1 && (
                  <Crown className="absolute -top-2 -right-2 h-5 w-5 text-primary" strokeWidth={3} />
                )}
              </div>

              <Avatar className="h-12 w-12 cartoon-border">
                <AvatarImage src={player.avatar || "/placeholder.svg"} />
                <AvatarFallback className="bg-secondary text-secondary-foreground font-black">
                  {player.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-black text-foreground truncate text-lg">{player.name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-bold">
                  <span>{player.xp.toLocaleString()} XP</span>
                  <span>•</span>
                  <span>{player.wins} wins</span>
                </div>
              </div>

              {player.rank <= 3 && (
                <TrendingUp className="h-5 w-5 text-chart-3" strokeWidth={3} />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-6 rounded-xl bg-secondary/50 cartoon-border cartoon-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1 font-bold">Your Rank</p>
            <p className="text-3xl font-black text-foreground">#New</p>
          </div>
          <Badge className="cartoon-border bg-accent text-accent-foreground font-black">
            <TrendingUp className="h-4 w-4 mr-1" strokeWidth={3} />
            New Player
          </Badge>
        </div>
      </div>
    </Card>
  )
}