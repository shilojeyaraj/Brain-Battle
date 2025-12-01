"use client"

import { useState, useEffect } from "react"
import { getRankFromXP, getRankProgress, getRankIcon, formatXP } from "@/lib/rank-system"
import { getCurrentLevel, getXPToNextLevel } from "@/lib/xp-calculator"

interface XPProgressBarProps {
  xp: number
  showRank?: boolean
  size?: "sm" | "md" | "lg"
  animated?: boolean
  className?: string
}

export function XPProgressBar({ 
  xp, 
  showRank = true, 
  size = "md",
  animated = true,
  className = ""
}: XPProgressBarProps) {
  const [displayXP, setDisplayXP] = useState(xp)
  const [isAnimating, setIsAnimating] = useState(false)

  // Animate XP changes
  useEffect(() => {
    if (animated && displayXP !== xp) {
      setIsAnimating(true)
      const startXP = displayXP
      const difference = xp - startXP
      const duration = 1000 // 1 second
      const steps = 30
      const stepDuration = duration / steps
      const stepSize = difference / steps

      let currentStep = 0
      const timer = setInterval(() => {
        currentStep++
        const newXP = Math.round(startXP + (stepSize * currentStep))
        setDisplayXP(newXP)

        if (currentStep >= steps) {
          setDisplayXP(xp)
          clearInterval(timer)
          setIsAnimating(false)
        }
      }, stepDuration)

      return () => clearInterval(timer)
    } else {
      setDisplayXP(xp)
    }
  }, [xp, animated])

  const rank = getRankFromXP(displayXP)
  const rankProgress = getRankProgress(displayXP)
  const levelProgress = getCurrentLevel(displayXP)
  const xpToNextLevel = getXPToNextLevel(displayXP)
  const currentLevelXP = (levelProgress - 1) * 1000
  const nextLevelXP = levelProgress * 1000
  const levelProgressPercent = ((displayXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100

  const sizeClasses = {
    sm: {
      container: "h-8",
      bar: "h-2",
      text: "text-xs",
      icon: "h-3 w-3"
    },
    md: {
      container: "h-12",
      bar: "h-3",
      text: "text-sm",
      icon: "h-4 w-4"
    },
    lg: {
      container: "h-16",
      bar: "h-4",
      text: "text-base",
      icon: "h-5 w-5"
    }
  }

  const classes = sizeClasses[size]

  return (
    <div className={`w-full ${className}`}>
      {/* Level and XP Display */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {showRank && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${rank.bgColor} ${rank.textColor} border border-${rank.color}`}>
              {getRankIcon(rank, classes.icon)}
              <span className={`font-bold ${classes.text}`}>{rank.name}</span>
            </div>
          )}
          <div className={`font-bold ${classes.text} text-foreground`}>
            Level {levelProgress}
          </div>
        </div>
        <div className={`${classes.text} text-muted-foreground font-medium`}>
          {formatXP(displayXP)} XP
        </div>
      </div>

      {/* Level Progress Bar */}
      <div className="relative">
        <div className={`w-full ${classes.bar} bg-muted rounded-full overflow-hidden`}>
          <div 
            className={`${classes.bar} bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500 ease-out ${
              isAnimating ? 'animate-pulse' : ''
            }`}
            style={{ width: `${Math.min(100, Math.max(0, levelProgressPercent))}%` }}
          />
        </div>
        
        {/* XP to Next Level - Only show text when bar is wide enough */}
        {levelProgressPercent > 15 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs font-bold text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
              {xpToNextLevel > 0 ? `${xpToNextLevel} to next level` : 'Max Level!'}
            </span>
          </div>
        )}
      </div>

      {/* Rank Progress (if not at highest rank) */}
      {rankProgress.next && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Progress to {rankProgress.next.name}</span>
            <span>{Math.round(rankProgress.progress)}%</span>
          </div>
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-1 bg-gradient-to-r from-secondary to-secondary/80 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, rankProgress.progress))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface CompactXPBarProps {
  xp: number
  showXP?: boolean
  className?: string
}

export function CompactXPBar({ xp, showXP = true, className = "" }: CompactXPBarProps) {
  const rank = getRankFromXP(xp)
  const level = getCurrentLevel(xp)
  const xpToNextLevel = getXPToNextLevel(xp)
  const currentLevelXP = (level - 1) * 1000
  const nextLevelXP = level * 1000
  const progressPercent = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Rank Icon */}
      <div className={`p-1 rounded-full ${rank.bgColor}`}>
        {getRankIcon(rank, "h-4 w-4")}
      </div>
      
      {/* Level */}
      <span className="text-sm font-bold text-foreground">
        Lv.{level}
      </span>
      
      {/* Progress Bar */}
      <div className="flex-1 min-w-[60px]">
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-2 bg-primary rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      </div>
      
      {/* XP Display */}
      {showXP && (
        <span className="text-xs text-muted-foreground font-medium">
          {formatXP(xp)}
        </span>
      )}
    </div>
  )
}
