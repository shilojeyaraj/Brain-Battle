"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, X } from "lucide-react"
import { AchievementRarity, RARITY_COLORS, RARITY_BORDER_COLORS } from "@/lib/achievements/achievement-types"
import { cn } from "@/lib/utils"
import { ACHIEVEMENT_ICONS, type AchievementIconName } from "./icons/achievement-icons"
import { getAchievementIconName } from "@/lib/achievements/icon-mapping"
import { BadgeFrame } from "./badge-frame"

export interface AchievementNotificationData {
  code: string
  name: string
  description: string
  icon: string
  rarity: AchievementRarity
  xp_reward: number
}

interface AchievementNotificationProps {
  achievement: AchievementNotificationData
  onClose: () => void
}

const RARITY_GRADIENTS: Record<AchievementRarity, string> = {
  common: "from-gray-500/20 to-gray-600/20",
  rare: "from-blue-500/20 to-blue-600/20",
  epic: "from-purple-500/20 to-purple-600/20",
  legendary: "from-orange-500/20 to-orange-600/20",
}

const RARITY_GLOW: Record<AchievementRarity, string> = {
  common: "shadow-gray-500/50",
  rare: "shadow-blue-500/50",
  epic: "shadow-purple-500/50",
  legendary: "shadow-orange-500/50",
}

export function AchievementNotification({ achievement, onClose }: AchievementNotificationProps) {
  // Map achievement code to icon component name
  const iconName = getAchievementIconName(achievement.code) || achievement.icon as AchievementIconName
  const IconComponent = ACHIEVEMENT_ICONS[iconName]
  const hasCustomIcon = IconComponent !== undefined

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 50 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 25,
          duration: 0.5 
        }}
        className="fixed top-4 right-4 z-[200] max-w-md w-full"
      >
        <Card className={cn(
          "p-6 bg-gradient-to-br border-4 shadow-2xl relative overflow-hidden",
          RARITY_GRADIENTS[achievement.rarity],
          RARITY_BORDER_COLORS[achievement.rarity],
          RARITY_GLOW[achievement.rarity]
        )}>
          {/* Animated background particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className={cn(
                "absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl",
                RARITY_COLORS[achievement.rarity]
              )}
            />
          </div>

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: 2,
                    ease: "easeInOut"
                  }}
                  className="relative"
                >
                  {hasCustomIcon ? (
                    <BadgeFrame rarity={achievement.rarity} size={64} showGlow={achievement.rarity === "legendary"}>
                      <IconComponent size={40} />
                    </BadgeFrame>
                  ) : (
                    <div className={cn(
                      "w-16 h-16 rounded-xl flex items-center justify-center border-4",
                      RARITY_BORDER_COLORS[achievement.rarity],
                      RARITY_COLORS[achievement.rarity]
                    )}>
                      <div className="w-8 h-8 bg-slate-300 rounded" />
                    </div>
                  )}
                </motion.div>
                <div>
                  <Badge 
                    className={cn(
                      "mb-2 font-black text-xs",
                      RARITY_COLORS[achievement.rarity],
                      RARITY_BORDER_COLORS[achievement.rarity]
                    )}
                  >
                    {achievement.rarity.toUpperCase()}
                  </Badge>
                  <h3 className="text-xl font-black text-white">
                    Achievement Unlocked!
                  </h3>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/70 hover:text-white transition-colors"
                aria-label="Close notification"
              >
                <X className="w-5 h-5" strokeWidth={3} />
              </button>
            </div>

            {/* Achievement Details */}
            <div className="space-y-3">
              <div>
                <h4 className="text-lg font-black text-white mb-1">
                  {achievement.name}
                </h4>
                <p className="text-sm font-bold text-blue-100/80">
                  {achievement.description}
                </p>
              </div>

              {/* XP Reward */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/20 border-2 border-orange-400/50"
              >
                <Zap className="w-5 h-5 text-orange-300" strokeWidth={3} />
                <span className="text-orange-300 font-black">
                  +{achievement.xp_reward} XP Bonus!
                </span>
              </motion.div>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

