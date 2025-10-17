import { Crown, Medal, Award, Gem, Star, Trophy } from "lucide-react"

export interface RankInfo {
  name: string
  tier: number
  minXP: number
  maxXP: number
  color: string
  bgColor: string
  textColor: string
  icon: any
  description: string
}

export const RANK_TIERS: RankInfo[] = [
  {
    name: "Bronze",
    tier: 1,
    minXP: 0,
    maxXP: 9999,
    color: "orange-600",
    bgColor: "bg-orange-100",
    textColor: "text-orange-700",
    icon: Medal,
    description: "Starting your journey"
  },
  {
    name: "Silver", 
    tier: 2,
    minXP: 10000,
    maxXP: 24999,
    color: "gray-500",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
    icon: Award,
    description: "Building momentum"
  },
  {
    name: "Gold",
    tier: 3,
    minXP: 25000,
    maxXP: 49999,
    color: "yellow-500",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-700",
    icon: Trophy,
    description: "Proving your worth"
  },
  {
    name: "Platinum",
    tier: 4,
    minXP: 50000,
    maxXP: 74999,
    color: "blue-500",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
    icon: Star,
    description: "Elite competitor"
  },
  {
    name: "Diamond",
    tier: 5,
    minXP: 75000,
    maxXP: 99999,
    color: "cyan-500",
    bgColor: "bg-cyan-100",
    textColor: "text-cyan-700",
    icon: Gem,
    description: "Master of knowledge"
  },
  {
    name: "Master",
    tier: 6,
    minXP: 100000,
    maxXP: Infinity,
    color: "purple-600",
    bgColor: "bg-purple-100",
    textColor: "text-purple-700",
    icon: Crown,
    description: "Legendary scholar"
  }
]

export function getRankFromXP(xp: number): RankInfo {
  return RANK_TIERS.find(rank => xp >= rank.minXP && xp <= rank.maxXP) || RANK_TIERS[0]
}

export function getNextRank(xp: number): RankInfo | null {
  const currentRank = getRankFromXP(xp)
  const currentIndex = RANK_TIERS.findIndex(rank => rank.name === currentRank.name)
  
  if (currentIndex >= RANK_TIERS.length - 1) {
    return null // Already at highest rank
  }
  
  return RANK_TIERS[currentIndex + 1]
}

export function getXPToNextLevel(xp: number): number {
  const level = Math.floor(xp / 1000) + 1
  const nextLevelXP = level * 1000
  return nextLevelXP - xp
}

export function getXPToNextRank(xp: number): number {
  const nextRank = getNextRank(xp)
  if (!nextRank) return 0
  
  return nextRank.minXP - xp
}

export function getCurrentLevel(xp: number): number {
  return Math.floor(xp / 1000) + 1
}

export function getLevelProgress(xp: number): { current: number; next: number; progress: number } {
  const level = getCurrentLevel(xp)
  const currentLevelXP = (level - 1) * 1000
  const nextLevelXP = level * 1000
  const progress = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100
  
  return {
    current: level,
    next: level + 1,
    progress: Math.min(100, Math.max(0, progress))
  }
}

export function getRankProgress(xp: number): { current: RankInfo; next: RankInfo | null; progress: number } {
  const currentRank = getRankFromXP(xp)
  const nextRank = getNextRank(xp)
  
  if (!nextRank) {
    return {
      current: currentRank,
      next: null,
      progress: 100
    }
  }
  
  const progress = ((xp - currentRank.minXP) / (nextRank.minXP - currentRank.minXP)) * 100
  
  return {
    current: currentRank,
    next: nextRank,
    progress: Math.min(100, Math.max(0, progress))
  }
}

export function getRankBadgeClasses(rank: RankInfo): string {
  return `${rank.bgColor} ${rank.textColor} border-2 border-${rank.color}`
}

export function getRankIcon(rank: RankInfo, size: string = "h-5 w-5") {
  const IconComponent = rank.icon
  return <IconComponent className={`${size} ${rank.textColor}`} strokeWidth={2.5} />
}

export function formatXP(xp: number): string {
  if (xp >= 1000000) {
    return (xp / 1000000).toFixed(1) + 'M'
  } else if (xp >= 1000) {
    return (xp / 1000).toFixed(1) + 'K'
  }
  return xp.toString()
}

export function getRankTitle(xp: number): string {
  const rank = getRankFromXP(xp)
  const level = getCurrentLevel(xp)
  
  return `${rank.name} Scholar (Level ${level})`
}
