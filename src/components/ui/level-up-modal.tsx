"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Star, Zap, Trophy, Crown, Sparkles } from "lucide-react"
import { getRankFromXP, getRankIcon, getRankTitle } from "@/lib/rank-system"
import { getLevelUpInfo } from "@/lib/xp-calculator"
import { useFeedback } from "@/hooks/useFeedback"

interface LevelUpModalProps {
  isOpen: boolean
  onClose: () => void
  oldXP: number
  newXP: number
  xpEarned: number
  newRank?: string
  className?: string
}

export function LevelUpModal({ 
  isOpen, 
  onClose, 
  oldXP, 
  newXP, 
  xpEarned,
  newRank,
  className = ""
}: LevelUpModalProps) {
  const [showCelebration, setShowCelebration] = useState(false)
  const { playLevelUp, burstConfetti } = useFeedback()
  
  const levelUpInfo = getLevelUpInfo(oldXP, newXP)
  const oldRank = getRankFromXP(oldXP)
  const newRankInfo = getRankFromXP(newXP)
  const rankChanged = oldRank.name !== newRankInfo.name

  useEffect(() => {
    if (isOpen && levelUpInfo.leveledUp) {
      setShowCelebration(true)
      // SFX + particles
      playLevelUp()
      burstConfetti({ particleCount: 160, spread: 80, startVelocity: 45 })
      // Auto-close after 5 seconds
      const timer = setTimeout(() => {
        onClose()
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [isOpen, levelUpInfo.leveledUp, onClose, playLevelUp, burstConfetti])

  const celebrationVariants = {
    initial: { scale: 0, rotate: -180 },
    animate: { 
      scale: [0, 1.2, 1],
      rotate: [0, 360],
      transition: {
        duration: 1.5,
        ease: "easeOut" as any
      }
    },
    exit: { 
      scale: 0, 
      opacity: 0,
      transition: { duration: 0.3 }
    }
  }

  const sparkleVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: { 
      scale: [0, 1, 0],
      opacity: [0, 1, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatDelay: 0.5
      }
    }
  }

  if (!isOpen || !levelUpInfo.leveledUp) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className={`relative w-full max-w-md ${className}`}
        >
          {/* Celebration Background */}
          {showCelebration && (
            <div className="absolute inset-0 -z-10">
              {/* Sparkles */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  variants={sparkleVariants}
                  initial="initial"
                  animate="animate"
                  className="absolute"
                  style={{
                    left: `${20 + (i * 10)}%`,
                    top: `${20 + (i % 3) * 20}%`,
                  }}
                >
                  <Sparkles className="h-4 w-4 text-yellow-400" />
                </motion.div>
              ))}
            </div>
          )}

          {/* Main Modal */}
          <div className="bg-card rounded-2xl p-8 text-center shadow-2xl border-4 border-primary cartoon-border cartoon-shadow relative overflow-hidden">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-foreground" strokeWidth={3} />
            </button>

            {/* Level Up Icon */}
            <motion.div
              variants={celebrationVariants}
              initial="initial"
              animate="animate"
              className="mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center"
            >
              {levelUpInfo.levelsGained > 1 ? (
                <Crown className="h-10 w-10 text-primary-foreground" strokeWidth={2.5} />
              ) : (
                <Star className="h-10 w-10 text-primary-foreground" strokeWidth={2.5} />
              )}
            </motion.div>

            {/* Title */}
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-black text-foreground mb-2"
            >
              {levelUpInfo.levelsGained > 1 ? 'LEVEL UP!' : 'LEVEL UP!'}
            </motion.h2>

            {/* Level Change */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-4xl font-black text-primary mb-2"
            >
              Level {levelUpInfo.oldLevel} → Level {levelUpInfo.newLevel}
            </motion.div>

            {/* Rank Change */}
            {rankChanged && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mb-4"
              >
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className={`px-3 py-1 rounded-full ${oldRank.bgColor} ${oldRank.textColor} border border-${oldRank.color}`}>
                    {getRankIcon(oldRank, "h-4 w-4")}
                    <span className="ml-1 font-bold text-sm">{oldRank.name}</span>
                  </div>
                  <Zap className="h-5 w-5 text-primary" strokeWidth={2.5} />
                  <div className={`px-3 py-1 rounded-full ${newRankInfo.bgColor} ${newRankInfo.textColor} border border-${newRankInfo.color}`}>
                    {getRankIcon(newRankInfo, "h-4 w-4")}
                    <span className="ml-1 font-bold text-sm">{newRankInfo.name}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground font-bold">
                  New Rank: {getRankTitle(newXP)}
                </p>
              </motion.div>
            )}

            {/* XP Earned */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-primary/10 rounded-xl p-4 mb-4"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-primary" strokeWidth={2.5} />
                <span className="text-lg font-bold text-primary">+{xpEarned} XP</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Earned in this game
              </p>
            </motion.div>

            {/* Total XP */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-center"
            >
              <p className="text-sm text-muted-foreground font-bold mb-1">Total XP</p>
              <p className="text-xl font-black text-foreground">{newXP.toLocaleString()} XP</p>
            </motion.div>

            {/* Continue Button */}
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              onClick={onClose}
              className="mt-6 w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 px-6 rounded-xl font-bold text-lg transition-colors cartoon-border cartoon-shadow cartoon-hover"
            >
              Continue
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

interface XPNotificationProps {
  xpEarned: number
  breakdown?: string[]
  isVisible: boolean
  onComplete?: () => void
  className?: string
}

export function XPNotification({ 
  xpEarned, 
  breakdown = [], 
  isVisible, 
  onComplete,
  className = ""
}: XPNotificationProps) {
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onComplete?.()
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [isVisible, onComplete])

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className={`fixed top-4 right-4 z-40 ${className}`}
    >
      <div className="bg-card rounded-xl p-4 shadow-lg border-2 border-primary cartoon-border cartoon-shadow">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-bold text-foreground">XP Earned!</p>
            <p className="text-lg font-black text-primary">+{xpEarned} XP</p>
          </div>
        </div>
        
        {breakdown.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDetails ? 'Hide' : 'Show'} breakdown
            </button>
            {showDetails && (
              <div className="mt-2 space-y-1">
                {breakdown.map((item, index) => (
                  <p key={index} className="text-xs text-muted-foreground">
                    • {item}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
