"use client"

import { useState, useEffect, Suspense, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Brain, Trophy, Star, Settings, LogOut, User, RotateCw, Crown, Sparkles, Flame, FileText } from "lucide-react"
import { logout } from "@/lib/actions/custom-auth"
import { getUserStatsClient, UserProfile } from "@/lib/actions/user-stats-client"
import { UserProfileModal } from "@/components/ui/user-profile-modal"
import { getCurrentUserId, setUserSession } from "@/lib/auth/session"
import Link from "next/link"
import { SettingsModal } from "@/components/ui/settings-modal"
import { AchievementsModal } from "@/components/achievements/achievements-modal"

interface DashboardHeaderContentProps {
  onToggleStats?: () => void
  showStats?: boolean
}

function DashboardHeaderContent({ onToggleStats, showStats }: DashboardHeaderContentProps) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [streak, setStreak] = useState<number>(0) // Initialize to 0 so it shows immediately
  const [usageLimits, setUsageLimits] = useState<{documents: {remaining: number, isUnlimited: boolean}, quizzes: {remaining: number, isUnlimited: boolean}} | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const fetchUserId = async () => {
      // Try to get userId from session cookie first (more reliable)
      let userId: string | null = null
      try {
        const response = await fetch('/api/user/current')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.userId) {
            userId = data.userId
            console.log('✅ [DASHBOARD] User ID from session cookie:', userId)
          }
        }
      } catch (e) {
        console.warn('⚠️ [DASHBOARD] Failed to get userId from API, falling back to localStorage')
      }
      
      // Fallback to localStorage if API call failed (for backwards compatibility)
      if (!userId) {
        userId = await getCurrentUserId()
        if (userId) {
          console.log('✅ [DASHBOARD] User ID from localStorage:', userId)
        }
      }
      
      // Check for userId in URL params (legacy support - should not happen with secure cookies)
      const userIdFromUrl = searchParams.get('userId')
      if (userIdFromUrl && !userId) {
        userId = userIdFromUrl
        // Clear the URL parameter without causing a page reload
        const url = new URL(window.location.href)
        url.searchParams.delete('userId')
        window.history.replaceState({}, '', url.toString())
      }
      
      if (userId) {
        setCurrentUserId(userId)
      } else {
        console.log('❌ [DASHBOARD] No user session found')
      }
    }
    
    fetchUserId()
  }, [searchParams])

  // Memoize user profile fetching to prevent unnecessary API calls
  const fetchUserProfile = useCallback(async () => {
    if (!currentUserId || userProfile) return
    
    setIsLoading(true)
    try {
      const result = await getUserStatsClient(currentUserId)
      if (result.success && result.data) {
        setUserProfile(result.data)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentUserId, userProfile])

  useEffect(() => {
    if (currentUserId) {
      fetchUserProfile()
    }
  }, [currentUserId, fetchUserProfile])

  // 🚀 OPTIMIZATION: Memoize streak fetch function
  const fetchStreak = useCallback(async () => {
    if (!currentUserId) return
    
    try {
      const response = await fetch('/api/user/streak')
      if (response.ok) {
        const data = await response.json()
        setStreak(data.currentStreak || 0)
      }
    } catch (error) {
      console.error('Error fetching streak:', error)
    }
  }, [currentUserId])

  // Fetch streak data
  useEffect(() => {
    if (currentUserId) {
      fetchStreak()
      // Refresh every 5 minutes
      const interval = setInterval(fetchStreak, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [currentUserId, fetchStreak])

  // 🚀 OPTIMIZATION: Memoize usage limits fetch to prevent unnecessary calls
  const fetchUsageLimits = useCallback(async () => {
    if (!currentUserId) return
    
    try {
      const response = await fetch('/api/subscription/limits', {
        credentials: 'include'
      })
      const data = await response.json()
      if (data.success && data.usage) {
        setUsageLimits({
          documents: {
            remaining: data.usage.documents.remaining,
            isUnlimited: data.usage.documents.isUnlimited
          },
          quizzes: {
            remaining: data.usage.quizzes.remaining,
            isUnlimited: data.usage.quizzes.isUnlimited
          }
        })
      }
    } catch (err) {
      console.error('Error fetching usage limits:', err)
    }
  }, [currentUserId])

  // Fetch usage limits when menu opens (only fetch once per menu open)
  useEffect(() => {
    if (isMenuOpen && currentUserId && !usageLimits) {
      fetchUsageLimits()
    }
  }, [isMenuOpen, currentUserId, usageLimits, fetchUsageLimits])

  const handleAvatarClick = useCallback(() => {
    setIsMenuOpen(prev => !prev)
  }, [])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])
  return (
    <header className="border-b-4 border-slate-700/50 bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm sticky top-0 z-50 shadow-lg" data-tutorial="dashboard-header">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <h1
                className="text-4xl font-black tracking-tight bg-gradient-to-r from-blue-300 to-orange-400 bg-clip-text text-transparent"
                style={{ fontFamily: "var(--font-display)" }}
              >
                BRAIN BATTLE
              </h1>
            </div>
            <Badge className="border-2 border-orange-400/50 bg-orange-500/20 text-orange-300 font-black text-xs px-3 py-1">
              DASHBOARD
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            {/* Achievements Button */}
            <Link href="/dashboard/achievements">
              <Button
                className="font-black border-4 border-orange-400/50 bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 cartoon-border cartoon-shadow"
              >
                <Trophy className="h-5 w-5 mr-2" strokeWidth={3} />
                Achievements
              </Button>
            </Link>

            <div className="hidden md:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/60 border border-slate-700/50 backdrop-blur-sm">
                <Trophy className="h-5 w-5 text-primary" strokeWidth={3} />
                <span className="text-slate-400 font-bold">Rank:</span>
                <span className="font-black text-primary">#New</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/60 border border-slate-700/50 backdrop-blur-sm">
                <Star className="h-5 w-5 text-secondary" strokeWidth={3} />
                <span className="text-slate-400 font-bold">XP:</span>
                <span className="font-black text-secondary">0</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/60 border border-slate-700/50 backdrop-blur-sm" data-tutorial="streak-header">
                <Flame className="h-5 w-5 text-orange-500" strokeWidth={3} />
                <span className="text-slate-400 font-bold">Streak:</span>
                <span className="font-black text-orange-500">{streak}</span>
              </div>
            </div>

            <div className="relative" ref={menuRef}>
              <button
                onClick={handleAvatarClick}
                disabled={isLoading || !currentUserId}
                className="flex items-center gap-2 hover:scale-105 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative"
              >
                <Avatar className="h-12 w-12 cartoon-border cartoon-shadow cursor-pointer hover:shadow-lg transition-shadow">
                  <AvatarImage src={(userProfile as any)?.avatar_url || "/placeholder.svg?height=48&width=48"} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-black text-lg">
                    <User className="h-6 w-6" strokeWidth={3} />
                  </AvatarFallback>
                </Avatar>
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-card cartoon-border rounded-xl cartoon-shadow p-1 z-50">
                  {userProfile?.username && (
                    <div className="px-3 py-2 border-b border-border mb-1">
                      <span className="font-black text-foreground text-sm">{userProfile.username}</span>
                    </div>
                  )}
                  
                  {/* Usage Limits Quick View */}
                  {usageLimits && (
                    <div className="px-3 py-2 border-b border-border mb-1 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-bold flex items-center gap-1">
                          <FileText className="h-3 w-3" strokeWidth={3} />
                          Documents:
                        </span>
                        <span className={`font-black ${
                          usageLimits.documents.isUnlimited 
                            ? 'text-green-500' 
                            : usageLimits.documents.remaining === 0 
                            ? 'text-red-500' 
                            : usageLimits.documents.remaining <= 2 
                            ? 'text-orange-500' 
                            : 'text-foreground'
                        }`}>
                          {usageLimits.documents.isUnlimited ? 'Unlimited' : `${usageLimits.documents.remaining} left`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-bold flex items-center gap-1">
                          <Brain className="h-3 w-3" strokeWidth={3} />
                          Quizzes:
                        </span>
                        <span className={`font-black ${
                          usageLimits.quizzes.isUnlimited 
                            ? 'text-green-500' 
                            : usageLimits.quizzes.remaining === 0 
                            ? 'text-red-500' 
                            : usageLimits.quizzes.remaining <= 2 
                            ? 'text-orange-500' 
                            : 'text-foreground'
                        }`}>
                          {usageLimits.quizzes.isUnlimited ? 'Unlimited' : `${usageLimits.quizzes.remaining} left`}
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-lg text-left"
                    onClick={() => { setIsProfileModalOpen(true); setIsMenuOpen(false) }}
                    title="View Profile"
                  >
                    <User className="h-4 w-4 text-foreground" strokeWidth={3} />
                    <span className="font-bold text-foreground">Profile</span>
                  </button>
                  <Link
                    href="/pro"
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-lg text-left"
                    onClick={() => setIsMenuOpen(false)}
                    title="Brain Battle Pro"
                  >
                    <Crown className="h-4 w-4 text-yellow-500" strokeWidth={3} />
                    <span className="font-bold text-foreground">Brain Battle Pro</span>
                  </Link>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-lg text-left"
                    onClick={() => { setIsSettingsOpen(true); setIsMenuOpen(false) }}
                    title="Sound & Motion Settings"
                  >
                    <Settings className="h-4 w-4 text-foreground" strokeWidth={3} />
                    <span className="font-bold text-foreground">Settings</span>
                  </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-lg text-left"
                onClick={() => { setIsAchievementsOpen(true); setIsMenuOpen(false) }}
                title="View Achievements"
              >
                <Trophy className="h-4 w-4 text-chart-3" strokeWidth={3} />
                <span className="font-bold text-foreground">Achievements</span>
              </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-lg text-left"
                    onClick={async () => {
                      // Clear localStorage
                      localStorage.removeItem('dashboard_tutorial_completed')
                      
                      // Reset tutorial in database
                      try {
                        await fetch('/api/tutorial/reset', {
                          method: 'POST',
                          credentials: 'include',
                        })
                      } catch (error) {
                        console.error('Error resetting tutorial:', error)
                      }
                      
                      // Reload page with newUser param to trigger tutorial
                      window.location.href = '/dashboard?newUser=true&restartTutorial=true'
                    }}
                    title="Restart Tutorial"
                  >
                    <RotateCw className="h-4 w-4 text-foreground" strokeWidth={3} />
                    <span className="font-bold text-foreground">Restart Tutorial</span>
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-lg text-left"
                    onClick={() => {
                      localStorage.removeItem('user')
                      localStorage.removeItem('userId')
                      logout()
                      setIsMenuOpen(false)
                    }}
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4 text-foreground" strokeWidth={3} />
                    <span className="font-bold text-foreground">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <AchievementsModal
            isOpen={isAchievementsOpen}
            onClose={() => setIsAchievementsOpen(false)}
            userId={currentUserId}
          />
        </div>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userProfile={userProfile}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </header>
  )
}

interface DashboardHeaderProps {
  onToggleStats?: () => void
  showStats?: boolean
}

export function DashboardHeader({ onToggleStats, showStats }: DashboardHeaderProps = {}) {
  return (
    <Suspense fallback={
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-black text-foreground">Brain Battle</h1>
                <p className="text-sm text-muted-foreground font-bold">Loading...</p>
              </div>
            </div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </header>
    }>
      <DashboardHeaderContent onToggleStats={onToggleStats} showStats={showStats} />
    </Suspense>
  )
}
