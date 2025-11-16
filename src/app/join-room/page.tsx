'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, ArrowLeft, Users, Key } from 'lucide-react'
import Link from 'next/link'
import { getCurrentUserId } from '@/lib/auth/session'
import { Button } from '@/components/ui/button'

// Force dynamic rendering to avoid SSR issues
export const dynamic = 'force-dynamic'

export default function JoinRoomPage() {
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const currentUserId = await getCurrentUserId()
      if (!currentUserId) {
        console.log('❌ [JOIN-ROOM] No user session found, redirecting to login')
        router.push('/login')
        return
      }
      console.log('✅ [JOIN-ROOM] User session found:', currentUserId)
      setUserId(currentUserId)
    }
    checkUser()
  }, [router])

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!userId) {
        setError('You must be logged in to join a room')
        setLoading(false)
        return
      }

      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          roomCode: roomCode.toUpperCase(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to join room')
        setLoading(false)
        return
      }

      if (data.success && data.room) {
        router.push(`/room/${data.room.id}`)
      } else {
        setError('Failed to join room')
        setLoading(false)
      }
    } catch (err) {
      console.error('Error joining room:', err)
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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
            <h1 className="text-4xl font-bold text-gray-900">Join Study Room</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Enter the room code to join your friends' study session!
          </p>
        </div>

        {/* Join Room Form */}
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <form onSubmit={handleJoinRoom} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="roomCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Room Code
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="roomCode"
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center text-lg font-mono tracking-wider"
                    placeholder="ABC123"
                    maxLength={6}
                    required
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2 text-center">
                  Ask your friend for the 6-character room code
                </p>
              </div>

              <Button
                type="submit"
                loading={loading}
                loadingText="Joining Room..."
                disabled={roomCode.length !== 6}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <Users className="h-5 w-5 mr-2" />
                Join Room
              </Button>
            </form>
          </div>

          {/* Tips */}
          <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tips for joining</h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-start">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Room codes are 6 characters long (letters and numbers)</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Make sure you're connected to the same network as your friends</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>You can join at any time during the study session</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
