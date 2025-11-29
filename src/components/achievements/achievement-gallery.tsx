"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Zap, Lock, CheckCircle2 } from "lucide-react"
import { AchievementCategory, AchievementRarity, RARITY_COLORS, RARITY_BORDER_COLORS } from "@/lib/achievements/achievement-types"
import { cn } from "@/lib/utils"
import { ACHIEVEMENT_ICONS, type AchievementIconName } from "./icons/achievement-icons"
import { BadgeFrame } from "./badge-frame"

interface Achievement {
  id?: string
  code: string
  name: string
  description: string
  icon: string
  category: AchievementCategory
  rarity: AchievementRarity
  xp_reward: number
  earned?: boolean
  earned_at?: string | null
  progress?: {
    current?: number
    target?: number
    [key: string]: any
  }
}

interface AchievementGalleryProps {
  userId?: string
}

const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  wins: "Victories",
  streaks: "Streaks",
  accuracy: "Accuracy",
  activity: "Activity",
  level: "Levels",
  special: "Special",
}

const CATEGORY_COLORS: Record<AchievementCategory, string> = {
  wins: "text-orange-400",
  streaks: "text-orange-500",
  accuracy: "text-blue-400",
  activity: "text-green-400",
  level: "text-purple-400",
  special: "text-yellow-400",
}

export function AchievementGallery({ userId }: AchievementGalleryProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | "all">("all")
  const [selectedRarity, setSelectedRarity] = useState<AchievementRarity | "all">("all")

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const response = await fetch('/api/achievements/list?includeAll=true')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.allAchievements) {
            setAchievements(data.allAchievements)
          }
        }
      } catch (error) {
        console.error('Error fetching achievements:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAchievements()
  }, [userId])

  const filteredAchievements = achievements.filter(achievement => {
    if (selectedCategory !== "all" && achievement.category !== selectedCategory) return false
    if (selectedRarity !== "all" && achievement.rarity !== selectedRarity) return false
    return true
  })

  const earnedCount = achievements.filter(a => a.earned).length
  const totalCount = achievements.length
  const completionPercentage = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0

  const categories: AchievementCategory[] = ["wins", "streaks", "accuracy", "activity", "level", "special"]

  if (loading) {
    return (
      <Card className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-blue-100 font-bold">Loading achievements...</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-black text-white mb-2">Achievements</h2>
            <p className="text-blue-100/70 font-bold">
              {earnedCount} of {totalCount} unlocked
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-orange-400">{completionPercentage}%</div>
            <p className="text-sm text-blue-100/70 font-bold">Complete</p>
          </div>
        </div>
        <Progress value={completionPercentage} className="h-3" />
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setSelectedCategory("all")}
          className={cn(
            "px-4 py-2 rounded-lg font-black text-sm border-2 transition-all",
            selectedCategory === "all"
              ? "bg-blue-500 border-blue-400 text-white"
              : "bg-slate-700/50 border-slate-600/50 text-blue-100 hover:bg-slate-700"
          )}
        >
          All Categories
        </button>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={cn(
              "px-4 py-2 rounded-lg font-black text-sm border-2 transition-all",
              selectedCategory === category
                ? "bg-blue-500 border-blue-400 text-white"
                : "bg-slate-700/50 border-slate-600/50 text-blue-100 hover:bg-slate-700",
              CATEGORY_COLORS[category]
            )}
          >
            {CATEGORY_LABELS[category]}
          </button>
        ))}
      </div>

      {/* Rarity Filter */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setSelectedRarity("all")}
          className={cn(
            "px-4 py-2 rounded-lg font-black text-sm border-2 transition-all",
            selectedRarity === "all"
              ? "bg-blue-500 border-blue-400 text-white"
              : "bg-slate-700/50 border-slate-600/50 text-blue-100 hover:bg-slate-700"
          )}
        >
          All Rarities
        </button>
        {(["common", "rare", "epic", "legendary"] as AchievementRarity[]).map(rarity => (
          <button
            key={rarity}
            onClick={() => setSelectedRarity(rarity)}
            className={cn(
              "px-4 py-2 rounded-lg font-black text-sm border-2 transition-all capitalize",
              selectedRarity === rarity
                ? `${RARITY_COLORS[rarity]} border-current text-white`
                : "bg-slate-700/50 border-slate-600/50 text-blue-100 hover:bg-slate-700"
            )}
          >
            {rarity}
          </button>
        ))}
      </div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map((achievement) => {
          const IconComponent = ACHIEVEMENT_ICONS[achievement.icon as AchievementIconName]
          const hasCustomIcon = IconComponent !== undefined
          const isEarned = achievement.earned
          const progress = achievement.progress
          const progressPercentage = progress?.current && progress?.target
            ? Math.min(100, Math.round((progress.current / progress.target) * 100))
            : 0

          return (
            <Card
              key={achievement.code}
              className={cn(
                "p-4 bg-gradient-to-br border-4 relative overflow-hidden transition-all",
                isEarned
                  ? RARITY_GRADIENTS[achievement.rarity]
                  : "from-slate-800/50 to-slate-900/50",
                isEarned
                  ? RARITY_BORDER_COLORS[achievement.rarity]
                  : "border-slate-600/30",
                isEarned ? "opacity-100" : "opacity-60"
              )}
            >
              {/* Lock overlay for unearned */}
              {!isEarned && (
                <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center z-10">
                  <Lock className="w-12 h-12 text-slate-500" strokeWidth={2} />
                </div>
              )}

              {/* Earned badge */}
              {isEarned && (
                <div className="absolute top-2 right-2 z-10">
                  <CheckCircle2 className="w-6 h-6 text-green-400" strokeWidth={3} />
                </div>
              )}

              <div className="relative z-0">
                {/* Icon */}
                <div className="mb-3 mx-auto flex justify-center">
                  {hasCustomIcon ? (
                    <BadgeFrame 
                      rarity={achievement.rarity} 
                      size={64} 
                      showGlow={isEarned && achievement.rarity === "legendary"}
                    >
                      {isEarned ? (
                        <IconComponent size={40} />
                      ) : (
                        <div className="opacity-30">
                          <IconComponent size={40} />
                        </div>
                      )}
                    </BadgeFrame>
                  ) : (
                    <div className={cn(
                      "w-16 h-16 rounded-xl flex items-center justify-center border-4",
                      isEarned
                        ? RARITY_BORDER_COLORS[achievement.rarity]
                        : "border-slate-600/50",
                      isEarned
                        ? RARITY_COLORS[achievement.rarity]
                        : "bg-slate-700/50"
                    )}>
                      <div className={cn(
                        "w-8 h-8 rounded",
                        isEarned ? "bg-white" : "bg-slate-500"
                      )} />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Badge 
                      className={cn(
                        "font-black text-xs",
                        isEarned
                          ? RARITY_COLORS[achievement.rarity]
                          : "bg-slate-700 border-slate-600 text-slate-400"
                      )}
                    >
                      {achievement.rarity.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <h3 className={cn(
                    "font-black text-sm",
                    isEarned ? "text-white" : "text-slate-400"
                  )}>
                    {achievement.name}
                  </h3>
                  
                  <p className={cn(
                    "text-xs font-bold",
                    isEarned ? "text-blue-100/80" : "text-slate-500"
                  )}>
                    {achievement.description}
                  </p>

                  {/* Progress Bar */}
                  {!isEarned && progress?.current !== undefined && progress?.target !== undefined && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-400">
                        <span>{progress.current} / {progress.target}</span>
                        <span>{progressPercentage}%</span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                    </div>
                  )}

                  {/* XP Reward */}
                  <div className="flex items-center justify-center gap-1 pt-2">
                    <Zap className="w-4 h-4 text-orange-400" strokeWidth={2} />
                    <span className="text-xs font-black text-orange-400">
                      +{achievement.xp_reward} XP
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {filteredAchievements.length === 0 && (
        <Card className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 text-center">
          <p className="text-blue-100/70 font-bold">No achievements found with selected filters.</p>
        </Card>
      )}
    </div>
  )
}

const RARITY_GRADIENTS: Record<AchievementRarity, string> = {
  common: "from-gray-500/20 to-gray-600/20",
  rare: "from-blue-500/20 to-blue-600/20",
  epic: "from-purple-500/20 to-purple-600/20",
  legendary: "from-orange-500/20 to-orange-600/20",
}

