"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Users, Lock, Globe, LogIn, Zap } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { useFeedback } from "@/hooks/useFeedback"
import { useNavigationLoading } from "@/hooks/use-navigation-loading"
import { useBackgroundMusic } from "@/hooks/use-background-music"
import { NavigationLoadingOverlay } from "@/components/ui/navigation-loading-overlay"
import { requireAuthOrRedirect } from "@/lib/utils/require-auth-redirect"

const activeLobbies: any[] = [
  // Empty array - no active lobbies yet
  // In the future, this will fetch real lobbies from the database       
]

export function LobbySection() {
  const [searchQuery, setSearchQuery] = useState("")
  const [mounted, setMounted] = useState(false)
  const [loadingButton, setLoadingButton] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { playClick, burstConfetti } = useFeedback()
  const isNavigating = loadingButton !== null
  const showLoadingOverlay = useNavigationLoading(isNavigating)
  
  // Play lobby background music
  useBackgroundMusic("lobby")
  
  // Clear loading state when pathname changes (navigation completed)
  useEffect(() => {
    if (loadingButton) {
      // Navigation has completed, clear loading state
      setLoadingButton(null)
    }
  }, [pathname])

  useEffect(() => {
    setMounted(true)
  }, [])


  // Fire a single confetti burst on lobby load (respects Reduced Motion)
  useEffect(() => {
    if (!mounted) return
    let initialTimeout: number | undefined
    try {
      // small initial delay so the UI paints first
      initialTimeout = window.setTimeout(() => {
        burstConfetti({ particleCount: 100, spread: 70, startVelocity: 40 })
      }, 300)
    } catch {
      // ignore
    }
    return () => {
      if (initialTimeout) window.clearTimeout(initialTimeout)
    }
  }, [mounted, burstConfetti])

  const handleCreateLobby = async () => {
    playClick()
    
    // Check authentication first
    const isAuthenticated = await requireAuthOrRedirect(router, pathname, searchParams)
    if (!isAuthenticated) return // Already redirected to login
    
    // Set loading immediately for visual feedback
    setLoadingButton('create')
    try {
      // router.push returns a promise in App Router
      await router.push("/create-room")
      // Loading state will persist until component unmounts (page navigation completes)
      // Don't clear manually - let it persist during navigation
    } catch (error) {
      console.error("Navigation error:", error)
      setLoadingButton(null)
    }
  }

  const handleJoinLobby = async () => {
    playClick()
    
    // Check authentication first
    const isAuthenticated = await requireAuthOrRedirect(router, pathname, searchParams)
    if (!isAuthenticated) return // Already redirected to login
    
    // Set loading immediately for visual feedback
    setLoadingButton('join')
    try {
      // router.push returns a promise in App Router
      await router.push("/join-room")
      // Loading state will persist until component unmounts (page navigation completes)
      // Don't clear manually - let it persist during navigation
    } catch (error) {
      console.error("Navigation error:", error)
      setLoadingButton(null)
    }
  }

  const handleStartSingleplayer = async () => {
    playClick()
    
    // Check authentication first
    const isAuthenticated = await requireAuthOrRedirect(router, pathname, searchParams)
    if (!isAuthenticated) return // Already redirected to login
    
    // Set loading immediately for visual feedback
    setLoadingButton('singleplayer')
    
    try {
      // router.push returns a promise in App Router
      await router.push("/singleplayer")
      // Loading state will persist until component unmounts (page navigation completes)
      // Don't clear manually - let it persist during navigation
    } catch (error) {
      console.error("Navigation error:", error)
      setLoadingButton(null)
    }
  }

  if (!mounted) {
    return (
      <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700/50 rounded mb-4"></div>
          <div className="h-10 bg-slate-700/50 rounded mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-700/50 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <>
      <NavigationLoadingOverlay 
        show={showLoadingOverlay} 
        message={loadingButton === 'create' ? 'Creating lobby...' : 
                 loadingButton === 'join' ? 'Joining lobby...' : 
                 loadingButton === 'singleplayer' ? 'Starting battle...' : 
                 'Loading...'} 
      />
      <Card className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg" data-tutorial="lobby-section">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-4xl font-black text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Battle Lobbies
          </h2>
          <p className="text-base text-blue-100/70 font-bold">Join or create a study battle</p>
        </div>
        <div className="flex gap-4">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button 
              onClick={handleStartSingleplayer}
              loading={loadingButton === 'singleplayer'}
              loadingText="Loading..."
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xl px-8 py-4 cartoon-border cartoon-shadow cartoon-hover cursor-pointer"
              type="button"
              data-tutorial="singleplayer-button"
            >
              <Zap className="h-6 w-6 mr-3" strokeWidth={3} />
              Singleplayer
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button 
              onClick={handleJoinLobby}
              loading={loadingButton === 'join'}
              loadingText="Loading..."
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-black text-xl px-8 py-4 cartoon-border cartoon-shadow cartoon-hover cursor-pointer"
              type="button"
              data-tutorial="join-lobby-button"
            >
              <LogIn className="h-6 w-6 mr-3" strokeWidth={3} />
              Join Lobby
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button 
              onClick={handleCreateLobby}
              loading={loadingButton === 'create'}
              loadingText="Loading..."
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-black text-xl px-8 py-4 cartoon-border cartoon-shadow cartoon-hover cursor-pointer"
              type="button"
              data-tutorial="create-lobby-button"
            >
              <Plus className="h-6 w-6 mr-3" strokeWidth={3} />
              Create Lobby
            </Button>
          </motion.div>
        </div>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-blue-100/70" strokeWidth={3} />
        <Input
          placeholder="Search lobbies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-14 h-14 text-xl font-bold border-4 border-slate-600/50 bg-slate-700/50 text-white placeholder:text-blue-100/50"
        />
      </div>

      <div className="space-y-6">
        {activeLobbies.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-xl bg-slate-700/50 border-4 border-slate-600/50 flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-blue-300/50" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-white mb-3">No active lobbies!</h3>
            <p className="text-lg text-blue-100/70 font-bold">Be the first to create a study battle and invite your friends.</p>
          </div>
        ) : (
          activeLobbies.map((lobby) => (
          <div
            key={lobby.id}
            className="p-6 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 hover:border-blue-400/50 transition-all duration-300 shadow-lg group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-black text-white text-xl group-hover:text-blue-300 transition-colors">
                    {lobby.name}
                  </h3>
                  {lobby.isPrivate ? (
                    <Lock className="h-5 w-5 text-blue-100/70" strokeWidth={3} />
                  ) : (
                    <Globe className="h-5 w-5 text-orange-400" strokeWidth={3} />
                  )}
                </div>
                <p className="text-sm text-blue-100/70 font-bold">
                  Hosted by <span className="text-white font-black">{lobby.host}</span>
                </p>
              </div>
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-black cartoon-border cartoon-shadow cartoon-hover"
              >
                Join Battle
              </Button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Badge className="cartoon-border bg-secondary text-secondary-foreground font-black">
                {lobby.subject}
              </Badge>
              <Badge
                className={`cartoon-border font-black ${
                  lobby.difficulty === "Hard"
                    ? "bg-destructive text-destructive-foreground"
                    : lobby.difficulty === "Medium"
                    ? "bg-primary text-primary-foreground"
                    : "bg-chart-3 text-foreground"
                }`}
              >
                {lobby.difficulty}
              </Badge>
              <div className="flex items-center gap-2 text-sm text-blue-100/70 ml-auto">
                <Users className="h-5 w-5" strokeWidth={3} />
                <span className="font-black text-white">
                  {lobby.players}/{lobby.maxPlayers}
                </span>
              </div>
            </div>
          </div>
          ))
        )}
      </div>
    </Card>
    </>
  )
}