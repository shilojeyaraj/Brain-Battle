/**
 * Join Lobby Page
 * 
 * SEO-friendly public page for joining a multiplayer lobby/room.
 * If user is not authenticated, redirects to login with redirect parameter.
 * 
 * SEO Benefits:
 * - Indexable URL: /join-lobby
 * - Shareable links: /join-lobby?code=ABC123
 * - Better user experience with auth redirect
 */

"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Brain, Users, Key, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useRequireAuth } from "@/hooks/use-require-auth"
import { useBackgroundMusic } from "@/hooks/use-background-music"
import { motion } from "framer-motion"
import { Breadcrumbs, BreadcrumbSchema } from "@/components/ui/breadcrumbs"

function JoinLobbyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userId, loading } = useRequireAuth()
  const [roomCode, setRoomCode] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState("")
  
  // Play lobby background music
  useBackgroundMusic("lobby")

  // Pre-fill room code from URL if provided
  useEffect(() => {
    const codeParam = searchParams.get("code")
    if (codeParam) {
      setRoomCode(codeParam.toUpperCase())
    }
  }, [searchParams])

  // Redirect to room if authenticated and code is provided
  useEffect(() => {
    if (!loading && userId && roomCode && roomCode.length === 8) {
      // Small delay to show the page briefly
      const timer = setTimeout(() => {
        router.push(`/room/${roomCode}`)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [loading, userId, roomCode, router])

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!roomCode || roomCode.length !== 8) {
      setError("Please enter a valid 8-character room code")
      return
    }

    setIsJoining(true)

    try {
      // Redirect to room page
      router.push(`/room/${roomCode.toUpperCase()}`)
    } catch (err) {
      setError("Failed to join room. Please try again.")
      setIsJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-blue-200 font-bold">Loading...</p>
        </div>
      </div>
    )
  }

  if (!userId) {
    return null // Redirecting to login
  }

  return (
    <>
      <BreadcrumbSchema items={[{ label: "Join Lobby" }]} />
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float" />
          <div
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-float"
            style={{ animationDelay: "1s" }}
          />
        </div>

      <div className="relative z-10 container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md mx-auto"
        >
          <div className="mb-6">
            <Breadcrumbs items={[{ label: "Join Lobby" }]} />
          </div>
          <div className="mb-8">
            <Link href="/dashboard">
              <Button
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black border-2 border-orange-400 shadow-lg hover:shadow-xl hover:shadow-orange-500/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={3} />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center border-2 border-blue-400">
                <Users className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-black bg-gradient-to-r from-blue-300 to-orange-400 bg-clip-text text-transparent">
                JOIN LOBBY
              </span>
            </div>
            <h1 className="text-2xl font-black text-white mb-2">
              Enter Room Code
            </h1>
            <p className="text-blue-100/70 font-bold">
              Join a multiplayer study battle with friends
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg">
              <form onSubmit={handleJoin} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="roomCode" className="text-sm font-black text-blue-100 flex items-center gap-2">
                    <Key className="w-4 h-4" strokeWidth={3} />
                    Room Code
                  </label>
                  <Input
                    id="roomCode"
                    type="text"
                    placeholder="Enter 8-character code"
                    value={roomCode}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)
                      setRoomCode(value)
                      setError("")
                    }}
                    className="h-12 text-lg font-black text-center tracking-widest border-2 border-slate-600/50 bg-slate-900/50 text-white placeholder:text-blue-100/50 focus:border-blue-400"
                    maxLength={8}
                    required
                    disabled={isJoining}
                    autoFocus
                  />
                  <p className="text-xs text-blue-200/60 font-bold">
                    Ask your friend or teacher for the room code
                  </p>
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border-2 border-red-500/50">
                    <p className="text-red-400 font-bold text-sm">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isJoining || roomCode.length !== 8}
                  className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black text-lg border-2 border-blue-400 disabled:opacity-50"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Users className="w-5 h-5 mr-2" strokeWidth={3} />
                      Join Lobby
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-700/50">
                <p className="text-sm text-blue-100/70 font-bold text-center mb-4">
                  Don't have a room code?
                </p>
                <Link href="/create-room">
                  <Button
                    variant="outline"
                    className="w-full h-12 border-2 border-slate-600/50 text-white hover:bg-slate-700/50 font-bold"
                  >
                    Create Your Own Room
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
    </>
  )
}

export default function JoinLobbyPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      }
    >
      <JoinLobbyContent />
    </Suspense>
  )
}

