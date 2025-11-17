import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Clock, Users, Target } from "lucide-react"

const recentBattles: any[] = [
  // Empty array for new users - no battles yet!
]

export function RecentBattles() {
  return (
    <Card className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg">
      <div className="mb-8">
        <h2 className="text-4xl font-black text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>
          Recent Battles
        </h2>
        <p className="text-base text-blue-100/70 font-bold">Your latest showdowns</p>
      </div>

      <div className="space-y-6">
        {recentBattles.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-xl bg-slate-700/50 border-4 border-slate-600/50 flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-blue-300/50" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-white mb-3">No battles yet!</h3>
            <p className="text-lg text-blue-100/70 font-bold">Join a lobby to start your first battle and see your results here.</p>
          </div>
        ) : (
          recentBattles.map((battle) => (
          <div
            key={battle.id}
            className="p-6 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 hover:border-blue-400/50 transition-all duration-300 shadow-lg group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-700/50 border-2 border-slate-600/50">
                  {battle.result === "Won" ? (
                    <Trophy className="w-5 h-5 text-orange-400" strokeWidth={3} />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-red-500" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-white text-lg group-hover:text-blue-300 transition-colors">{battle.name}</h3>
                  <p className="text-sm text-blue-100/70 font-bold">{battle.subject}</p>
                </div>
              </div>
              <Badge
                className={`cartoon-border font-black ${
                  battle.result === "Won"
                    ? "bg-gradient-to-br from-orange-500/20 to-orange-600/20 text-orange-300 border-orange-400/50"
                    : "bg-gradient-to-br from-red-500/20 to-red-600/20 text-red-300 border-red-400/50"
                }`}
              >
                {battle.result}
              </Badge>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-400" strokeWidth={3} />
                <span className="text-blue-100/70 font-bold">Score:</span>
                <span className="font-black text-white">{battle.score}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" strokeWidth={3} />
                <span className="text-blue-100/70 font-bold">Time:</span>
                <span className="font-black text-white">{battle.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-400" strokeWidth={3} />
                <span className="text-blue-100/70 font-bold">Players:</span>
                <span className="font-black text-white">{battle.players}</span>
              </div>
              <div className="ml-auto">
                <span className="text-blue-100/70 font-bold">{battle.date}</span>
              </div>
            </div>
          </div>
          ))
        )}
      </div>
    </Card>
  )
}