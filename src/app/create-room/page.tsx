/**
 * Create Room Page
 * 
 * SEO-friendly public page for creating multiplayer rooms.
 * Uses useRequireAuth hook for authentication.
 * 
 * SEO Benefits:
 * - Indexable URL: /create-room
 * - Better discoverability for "create study room" searches
 */

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, Users, ArrowLeft, Crown, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useSubscription } from '@/hooks/use-subscription'
import { UpgradePrompt } from '@/components/subscription/upgrade-prompt'
import { Button } from '@/components/ui/button'
import { useRequireAuth } from '@/hooks/use-require-auth'

// Force dynamic rendering to avoid SSR issues
export const dynamic = 'force-dynamic'

function CreateRoomContent() {
  const [roomName, setRoomName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const router = useRouter()
  const { userId, loading: authLoading } = useRequireAuth()
  const { isPro, limits, loading: subscriptionLoading } = useSubscription(userId)
  
  // Set max players based on subscription when limits load
  // CRITICAL: This hook must be called unconditionally before any early returns
  // to maintain consistent hook order across renders
  useEffect(() => {
    // Only update if we have valid limits and subscription has finished loading
    if (!subscriptionLoading && limits && limits.maxPlayersPerRoom) {
      setMaxPlayers(limits.maxPlayersPerRoom)
    }
  }, [limits, subscriptionLoading])

  if (authLoading) {
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

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setShowUpgradePrompt(false)

    try {
      if (!userId) {
        setError('You must be logged in to create a room')
        setLoading(false)
        return
      }

      // Check if requested room size exceeds free tier limit
      if (!isPro && maxPlayers > 4) {
        setShowUpgradePrompt(true)
        setError('Free users can create rooms with up to 4 players. Upgrade to Pro for rooms with up to 20 players.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          name: roomName,
          maxPlayers,
          isPrivate: false,
          timeLimit: 30,
          totalQuestions: 10,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.requiresPro) {
          setShowUpgradePrompt(true)
        }
        setError(data.error || 'Failed to create room')
        setLoading(false)
        return
      }

      if (data.success && data.room) {
        router.push(`/room/${data.room.id}`)
      } else {
        setError('Failed to create room')
        setLoading(false)
      }
    } catch (err) {
      console.error('Error creating room:', err)
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }


  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-float" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/dashboard" className="inline-flex items-center text-blue-300 hover:text-blue-200 transition-colors mb-6">
            <ArrowLeft className="h-5 w-5 mr-2" strokeWidth={3} />
            <span className="font-bold">Back to Dashboard</span>
          </Link>
          <div className="flex items-center justify-center mb-4">
            <Brain className="h-10 w-10 text-blue-400 mr-3" strokeWidth={3} />
            <h1 className="text-4xl font-black text-white">Create Study Room</h1>
          </div>
          <p className="text-xl text-blue-100/80 max-w-2xl mx-auto font-bold">
            Start a new study session and invite friends to compete with you!
          </p>
        </div>

        {/* Create Room Form */}
        <div className="max-w-md mx-auto">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 rounded-2xl shadow-lg p-8">
            <form onSubmit={handleCreateRoom} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border-2 border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
                  <p className="font-bold">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="roomName" className="block text-sm font-black text-blue-100 mb-2">
                  Room Name
                </label>
                <input
                  id="roomName"
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-600/50 bg-slate-900/50 text-white placeholder:text-blue-100/50 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  placeholder="e.g., Physics Study Session"
                  required
                />
              </div>

              <div>
                <label htmlFor="maxPlayers" className="block text-sm font-black text-blue-100 mb-2">
                  Maximum Players
                  {!isPro && (
                    <span className="ml-2 text-xs text-orange-400 font-bold">
                      (Free: Max 4)
                    </span>
                  )}
                  {isPro && (
                    <span className="ml-2 text-xs text-yellow-400 font-bold flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      Pro: Up to 20
                    </span>
                  )}
                </label>
                <input
                  id="maxPlayers"
                  type="number"
                  min="2"
                  max={limits?.maxPlayersPerRoom || 4}
                  value={maxPlayers}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10)
                    if (value >= 2 && value <= (limits?.maxPlayersPerRoom || 4)) {
                      setMaxPlayers(value)
                    }
                  }}
                  className="w-full px-4 py-3 border-2 border-slate-600/50 bg-slate-900/50 text-white rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 disabled:opacity-50"
                  disabled={subscriptionLoading}
                />
                <p className="text-xs text-blue-100/70 mt-1 font-bold">
                  {isPro 
                    ? 'Pro users can create rooms with up to 20 players'
                    : 'Upgrade to Pro to create rooms with up to 20 players'
                  }
                </p>
              </div>

              {showUpgradePrompt && (
                <div className="mt-4">
                  <UpgradePrompt
                    feature="room size"
                    limit="4 players"
                  />
                </div>
              )}

              <Button
                type="submit"
                loading={loading || subscriptionLoading}
                loadingText="Creating Room..."
                disabled={subscriptionLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black text-lg py-3 px-4 rounded-lg border-2 border-blue-400"
              >
                <Users className="h-5 w-5 mr-2" />
                Create Room
              </Button>
            </form>
          </div>

          {/* Features */}
          <div className="mt-8 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-black text-white mb-4">What happens next?</h3>
            <ul className="space-y-3 text-blue-100/80">
              <li className="flex items-start">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span className="font-bold">You'll get a unique room code to share with friends</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span className="font-bold">Upload your study materials (PDFs, documents, etc.)</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span className="font-bold">Select what topics you want to be quizzed on</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span className="font-bold">AI generates questions and the competition begins!</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CreateRoomPage() {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-blue-200 font-bold">Loading...</p>
        </div>
      </div>
    }>
      <CreateRoomContent />
    </Suspense>
  )
}
