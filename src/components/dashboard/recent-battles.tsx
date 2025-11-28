"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Trophy, Clock, Users, Target, FileText, ExternalLink } from "lucide-react"
import Link from "next/link"

export function RecentBattles() {
  const [recentBattles, setRecentBattles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecentBattles = async () => {
      try {
        const response = await fetch("/api/user-stats")
        if (response.ok) {
          const data = await response.json()
          if (data.recentGames && Array.isArray(data.recentGames)) {
            setRecentBattles(data.recentGames)
          }
        }
      } catch (error) {
        console.error('Error fetching recent battles:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentBattles()
  }, [])

  if (loading) {
    return (
      <Card className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg">
        <div className="mb-8">
          <h2 className="text-4xl font-black text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Recent Battles
          </h2>
          <p className="text-base text-blue-100/70 font-bold">Your latest showdowns</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-700/50 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </Card>
    )
  }

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
          <EmptyState
            icon={Trophy}
            title="No battles yet!"
            description="Start a singleplayer battle or join a lobby to see your results here."
            action={{
              label: "Start Singleplayer Battle",
              href: "/singleplayer"
            }}
            size="md"
          />
        ) : (
          recentBattles.map((battle) => {
            const sessionId = battle.session_id || battle.quiz_sessions?.id
            return (
              <Link
                key={battle.id || sessionId}
                href={sessionId ? `/singleplayer/battle/${sessionId}` : '#'}
                className="block"
              >
                <div className="p-6 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 hover:border-blue-400/50 transition-all duration-300 shadow-lg group cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-700/50 border-2 border-slate-600/50">
                        {battle.players === "1" || battle.players === "Practice" ? (
                          <div className="w-5 h-5 rounded-full bg-blue-500" />
                        ) : battle.result === "Won" ? (
                          <Trophy className="w-5 h-5 text-orange-400" strokeWidth={3} />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-red-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-black text-white text-lg group-hover:text-blue-300 transition-colors">
                          {battle.name}
                        </h3>
                        <p className="text-sm text-blue-100/70 font-bold">{battle.subject}</p>
                      </div>
                    </div>
                    <Badge
                      className={`cartoon-border font-black ${
                        battle.result === "Won"
                          ? "bg-gradient-to-br from-orange-500/20 to-orange-600/20 text-orange-300 border-orange-400/50"
                          : battle.result === "Lost"
                          ? "bg-gradient-to-br from-red-500/20 to-red-600/20 text-red-300 border-red-400/50"
                          : "bg-gradient-to-br from-slate-700 to-slate-800 text-blue-200 border-slate-500/70"
                      }`}
                    >
                      {battle.result}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-6 text-sm mb-3">
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

                  {sessionId && (
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-600/50">
                      <FileText className="h-4 w-4 text-blue-400" strokeWidth={3} />
                      <span className="text-xs text-blue-100/70 font-bold">Session ID:</span>
                      <span className="text-xs font-mono text-blue-300 font-black">{sessionId.substring(0, 8)}...</span>
                      <ExternalLink className="h-3 w-3 text-blue-400 ml-auto" strokeWidth={3} />
                    </div>
                  )}
                </div>
              </Link>
            )
          })
        )}
      </div>
    </Card>
  )
}