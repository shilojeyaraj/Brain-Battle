"use client"

import { useState, useEffect, Suspense, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Brain, Trophy, Star, Settings, LogOut, User, RotateCw } from "lucide-react"
import { logout } from "@/lib/actions/custom-auth"
import { getUserStatsClient, UserProfile } from "@/lib/actions/user-stats-client"
import { UserProfileModal } from "@/components/ui/user-profile-modal"
import { getCurrentUserId, setUserSession } from "@/lib/auth/session"
import Link from "next/link"
import { SettingsModal } from "@/components/ui/settings-modal"
import Image from "next/image"

interface DashboardHeaderContentProps {
  onToggleStats?: () => void
  showStats?: boolean
}

function DashboardHeaderContent({ onToggleStats, showStats }: DashboardHeaderContentProps) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const fetchUserId = async () => {
      // Check for userId in URL params (from login redirect)
      const userIdFromUrl = searchParams.get('userId')
      
      if (userIdFromUrl) {
        // Set the session and clear the URL parameter
        setCurrentUserId(userIdFromUrl)
        
        // Store the session in localStorage
        localStorage.setItem('userId', userIdFromUrl)
        console.log('✅ [DASHBOARD] User session stored:', userIdFromUrl)
        
        // Clear the URL parameter without causing a page reload
        const url = new URL(window.location.href)
        url.searchParams.delete('userId')
        window.history.replaceState({}, '', url.toString())
      } else {
        // Try to get user ID from session
        const userId = await getCurrentUserId()
        setCurrentUserId(userId)
        if (userId) {
          console.log('✅ [DASHBOARD] User session found:', userId)
        } else {
          console.log('❌ [DASHBOARD] No user session found')
        }
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

  const handleAvatarClick = useCallback(() => {
    if (userProfile) {
      setIsProfileModalOpen(true)
    }
  }, [userProfile])
  return (
    <header className="border-b-4 border-slate-700/50 bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm sticky top-0 z-50 shadow-lg" data-tutorial="dashboard-header">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Image 
                src="/brain-battle-logo.png" 
                alt="Brain Battle Logo" 
                width={56} 
                height={56} 
                className="w-14 h-14 object-contain"
              />
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
            <div className="hidden md:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card cartoon-border cartoon-shadow">
                <Trophy className="h-5 w-5 text-primary" strokeWidth={3} />
                <span className="text-muted-foreground font-bold">Rank:</span>
                <span className="font-black text-primary">#New</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card cartoon-border cartoon-shadow">
                <Star className="h-5 w-5 text-secondary" strokeWidth={3} />
                <span className="text-muted-foreground font-bold">XP:</span>
                <span className="font-black text-secondary">0</span>
              </div>
            </div>

            <Button 
              className="bg-card hover:bg-muted rounded-xl cartoon-border cartoon-shadow cartoon-hover text-foreground"
              onClick={() => {
                localStorage.removeItem('dashboard_tutorial_completed')
                window.location.reload()
              }}
              title="Restart Tutorial"
            >
              <RotateCw className="h-5 w-5 text-foreground" strokeWidth={3} />
            </Button>

            <Button 
              className="bg-card hover:bg-muted rounded-xl cartoon-border cartoon-shadow cartoon-hover text-foreground"
              onClick={() => setIsSettingsOpen(true)}
              title="Sound & Motion Settings"
            >
              <Settings className="h-5 w-5 text-foreground" strokeWidth={3} />
            </Button>

            <Button 
              onClick={() => {
                // Clear localStorage client-side
                localStorage.removeItem('user')
                localStorage.removeItem('userId')
                // Call server action to redirect
                logout()
              }}
              className="bg-card hover:bg-muted rounded-xl cartoon-border cartoon-shadow cartoon-hover text-foreground"
              title="Logout"
            >
              <LogOut className="h-5 w-5 text-foreground" strokeWidth={3} />
            </Button>

            <button
              onClick={handleAvatarClick}
              disabled={isLoading || !currentUserId}
              className="hover:scale-105 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative"
            >
              <Avatar className="h-12 w-12 cartoon-border cartoon-shadow cursor-pointer hover:shadow-lg transition-shadow">
                <AvatarImage src="/placeholder.svg?height=48&width=48" />
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
          </div>
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
              <Image 
                src="/brain-battle-logo.png" 
                alt="Brain Battle Logo" 
                width={48} 
                height={48} 
                className="w-12 h-12 object-contain"
              />
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
