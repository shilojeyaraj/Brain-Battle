'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Brain, ArrowLeft, Users, Key } from 'lucide-react'
import Link from 'next/link'
import { getCurrentUserId } from '@/lib/auth/session'

export default function JoinRoomPage() {
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const currentUserId = getCurrentUserId()
    if (!currentUserId) {
      console.log('❌ [JOIN-ROOM] No user session found, redirecting to login')
      router.push('/login')
      return
    }
    console.log('✅ [JOIN-ROOM] User session found:', currentUserId)
    setUserId(currentUserId)
  }, [router])

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!userId) {
        setError('You must be logged in to join a room')
        return
      }

      console.log('🔍 [JOIN-ROOM] Looking for room with code:', roomCode.toUpperCase())

      // Find room by code
      const { data: room, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode.toUpperCase())
        .single()

      if (roomError || !room) {
        console.error('❌ [JOIN-ROOM] Room not found:', roomError)
        setError('Room not found. Please check the code and try again.')
        return
      }

      console.log('✅ [JOIN-ROOM] Room found:', room.name)

      // Check if room is full
      if (room.current_players >= room.max_players) {
        setError('This room is full. Maximum players reached.')
        return
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('room_members')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', userId)
        .single()

      if (existingMember) {
        console.log('✅ [JOIN-ROOM] User is already a member, redirecting to room')
        router.push(`/room/${room.id}`)
        return
      }

      console.log('👥 [JOIN-ROOM] Adding user as room member...')

      // Add user as a member
      const { error: memberError } = await supabase
        .from('room_members')
        .insert({
          room_id: room.id,
          user_id: userId,
          joined_at: new Date().toISOString(),
          is_ready: false
        })

      if (memberError) {
        console.error('❌ [JOIN-ROOM] Member creation error:', memberError)
        setError(`Failed to join room: ${memberError.message}`)
        return
      }

      console.log('✅ [JOIN-ROOM] Successfully joined room, updating player count...')

      // Update current_players count
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ 
          current_players: room.current_players + 1
        })
        .eq('id', room.id)

      if (updateError) {
        console.error('⚠️ [JOIN-ROOM] Failed to update player count:', updateError)
        console.error('⚠️ [JOIN-ROOM] Update error details:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        })
        // Don't fail the join process for this
      } else {
        console.log('✅ [JOIN-ROOM] Player count updated successfully')
      }

      console.log('🎉 [JOIN-ROOM] Successfully joined room, redirecting...')
      router.push(`/room/${room.id}`)
    } catch (err) {
      console.error('❌ [JOIN-ROOM] Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
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

              <button
                type="submit"
                disabled={loading || roomCode.length !== 6}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {loading ? (
                  'Joining Room...'
                ) : (
                  <>
                    <Users className="h-5 w-5 mr-2" />
                    Join Room
                  </>
                )}
              </button>
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
