"use client"

import { useState, useEffect, Suspense, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Brain, Trophy, Star, Settings, LogOut, User } from "lucide-react"
import { logout } from "@/lib/actions/custom-auth"
import { getUserStatsClient, UserProfile } from "@/lib/actions/user-stats-client"
import { UserProfileModal } from "@/components/ui/user-profile-modal"
import { getCurrentUserId, setUserSession } from "@/lib/auth/session"
import Link from "next/link"

function DashboardHeaderContent() {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
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
      const userId = getCurrentUserId()
      setCurrentUserId(userId)
      if (userId) {
        console.log('✅ [DASHBOARD] User session found:', userId)
      } else {
        console.log('❌ [DASHBOARD] No user session found')
      }
    }
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
    <header className="cartoon-border border-b bg-card sticky top-0 z-50 cartoon-shadow" data-tutorial="dashboard-header">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center cartoon-border cartoon-shadow">
                <Brain className="w-8 h-8 text-primary-foreground" strokeWidth={3} />
              </div>
              <h1
                className="text-4xl font-black tracking-tight text-foreground"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Brain<span className="text-primary">Battle</span>
              </h1>
            </div>
            <Badge className="cartoon-border bg-accent text-accent-foreground font-black text-xs px-3 py-1 cartoon-shadow">
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
              className="bg-card hover:bg-muted rounded-xl cartoon-border cartoon-shadow cartoon-hover"
              onClick={() => {
                localStorage.removeItem('dashboard_tutorial_completed')
                window.location.reload()
              }}
              title="Restart Tutorial"
            >
              <Settings className="h-5 w-5" strokeWidth={3} />
            </Button>

            <form action={logout}>
              <Button type="submit" className="bg-card hover:bg-muted rounded-xl cartoon-border cartoon-shadow cartoon-hover">
                <LogOut className="h-5 w-5" strokeWidth={3} />
              </Button>
            </form>

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
    </header>
  )
}

export function DashboardHeader() {
  return (
    <Suspense fallback={
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary-foreground" strokeWidth={3} />
              </div>
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
      <DashboardHeaderContent />
    </Suspense>
  )
}
