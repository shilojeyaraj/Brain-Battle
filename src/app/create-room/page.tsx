'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, Users, ArrowLeft, Crown } from 'lucide-react'
import Link from 'next/link'
import { useSubscription } from '@/hooks/use-subscription'
import { UpgradePrompt } from '@/components/subscription/upgrade-prompt'
import { Button } from '@/components/ui/button'

// Force dynamic rendering to avoid SSR issues
export const dynamic = 'force-dynamic'

export default function CreateRoomPage() {
  const [roomName, setRoomName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const { isPro, limits, loading: subscriptionLoading } = useSubscription(userId)

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        // Fetch userId from API endpoint that uses secure session cookies
        const response = await fetch('/api/user/current')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.userId) {
            setUserId(data.userId)
            return
          }
        }
        // No valid session found
        router.push('/login')
      } catch (error) {
        console.error('Error checking user session:', error)
        router.push('/login')
      }
    }
    fetchUserId()
  }, [router])

  // Set max players based on subscription when limits load
  useEffect(() => {
    if (!subscriptionLoading && limits) {
      setMaxPlayers(limits.maxPlayersPerRoom)
    }
  }, [limits, subscriptionLoading])

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

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-bold">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-6">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Home
          </Link>
          <div className="flex items-center justify-center mb-4">
            <Brain className="h-10 w-10 text-indigo-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">Create Study Room</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start a new study session and invite friends to compete with you!
          </p>
        </div>

        {/* Create Room Form */}
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <form onSubmit={handleCreateRoom} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-2">
                  Room Name
                </label>
                <input
                  id="roomName"
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Physics Study Session"
                  required
                />
              </div>

              <div>
                <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Players
                  {!isPro && (
                    <span className="ml-2 text-xs text-orange-600 font-semibold">
                      (Free: Max 4)
                    </span>
                  )}
                  {isPro && (
                    <span className="ml-2 text-xs text-yellow-600 font-semibold flex items-center gap-1">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={subscriptionLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
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
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <Users className="h-5 w-5 mr-2" />
                Create Room
              </Button>
            </form>
          </div>

          {/* Features */}
          <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">What happens next?</h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-start">
                <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>You'll get a unique room code to share with friends</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Upload your study materials (PDFs, documents, etc.)</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Select what topics you want to be quizzed on</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>AI generates questions and the competition begins!</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
