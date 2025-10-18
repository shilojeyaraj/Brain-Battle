'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { generateRoomCode } from '@/lib/utils'
import { Brain, Users, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getCurrentUserId } from '@/lib/auth/session'

// Force dynamic rendering to avoid SSR issues
export const dynamic = 'force-dynamic'

export default function CreateRoomPage() {
  const [roomName, setRoomName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  
  // Create Supabase client inside component to avoid SSR issues
  const supabase = typeof window !== 'undefined' ? createClient() : null

  useEffect(() => {
    const currentUserId = getCurrentUserId()
    console.log('🔍 [CREATE-ROOM] Checking for user session...')
    console.log('🔍 [CREATE-ROOM] Current userId from localStorage:', currentUserId)
    console.log('🔍 [CREATE-ROOM] localStorage contents:', {
      userId: localStorage.getItem('userId'),
      user: localStorage.getItem('user')
    })
    
    if (!currentUserId) {
      console.log('❌ [CREATE-ROOM] No user session found, redirecting to login')
      router.push('/login')
      return
    }
    console.log('✅ [CREATE-ROOM] User session found:', currentUserId)
    setUserId(currentUserId)
  }, [router])

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!supabase) {
      setError('Application is loading, please try again.')
      setLoading(false)
      return
    }

    try {
      if (!userId) {
        setError('You must be logged in to create a room')
        setLoading(false)
        return
      }

      const roomCode = generateRoomCode()
      
      console.log('🏗️ [CREATE-ROOM] Creating room with data:', {
        name: roomName,
        room_code: roomCode,
        host_id: userId,
        max_players: 4,
        current_players: 1,
        status: 'waiting',
        is_private: false,
        time_limit: 30,
        total_questions: 10
      })
      
      const { data: room, error: roomError } = await supabase
        .from('game_rooms')
        .insert({
          name: roomName,
          room_code: roomCode,
          host_id: userId,
          max_players: 4,
          current_players: 1,
          status: 'waiting',
          is_private: false,
          time_limit: 30,
          total_questions: 10,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (roomError) {
        console.error('❌ [CREATE-ROOM] Room creation error:', roomError)
        console.error('❌ [CREATE-ROOM] Error details:', {
          message: roomError.message,
          details: roomError.details,
          hint: roomError.hint,
          code: roomError.code
        })
        setError(`Room creation failed: ${roomError.message}`)
        return
      }
      
      console.log('✅ [CREATE-ROOM] Room created successfully:', room)

      // Add creator as a member
      console.log('👥 [CREATE-ROOM] Adding creator as room member:', {
        room_id: room.id,
        user_id: userId,
        joined_at: new Date().toISOString(),
        is_ready: true
      })
      
      const { error: memberError } = await supabase
        .from('room_members')
        .insert({
          room_id: room.id,
          user_id: userId,
          joined_at: new Date().toISOString(),
          is_ready: true
        })

      if (memberError) {
        console.error('❌ [CREATE-ROOM] Member creation error:', memberError)
        console.error('❌ [CREATE-ROOM] Member error details:', {
          message: memberError.message,
          details: memberError.details,
          hint: memberError.hint,
          code: memberError.code
        })
        setError(`Failed to add creator to room: ${memberError.message}`)
        return
      }
      
      console.log('✅ [CREATE-ROOM] Creator added as room member successfully')

      router.push(`/room/${room.id}`)
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {loading ? (
                  'Creating Room...'
                ) : (
                  <>
                    <Users className="h-5 w-5 mr-2" />
                    Create Room
                  </>
                )}
              </button>
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
