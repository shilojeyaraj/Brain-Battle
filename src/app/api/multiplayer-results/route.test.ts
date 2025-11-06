import { POST } from './route'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      })
    },
    from: jest.fn((table: string) => {
      if (table === 'quiz_sessions') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'test-session-id',
                  room_id: 'test-room-id',
                  total_questions: 10,
                  time_limit: 30,
                  rooms: [{ id: 'test-room-id', difficulty: 'medium' }]
                },
                error: null
              })
            }))
          })),
          update: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ error: null })
          }))
        }
      }
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            in: jest.fn().mockResolvedValue({
              data: [
                { user_id: 'user1', display_name: 'Player 1' },
                { user_id: 'user2', display_name: 'Player 2' }
              ],
              error: null
            }))
          }))
        }
      }
      if (table === 'player_stats') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { win_streak: 0 },
                error: null
              })
            }))
          }))
        }
      }
      if (table === 'game_results') {
        return {
          insert: jest.fn(() => ({
            select: jest.fn().mockResolvedValue({
              data: [
                { user_id: 'user1', xp_earned: 100 },
                { user_id: 'user2', xp_earned: 80 }
              ],
              error: null
            }))
          }))
        }
      }
      if (table === 'game_rooms') {
        return {
          update: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ error: null })
          }))
        }
      }
      return {
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null })
        }))
      }
    }
  })
}))

jest.mock('@/lib/xp-calculator', () => ({
  calculateXP: jest.fn(() => ({
    totalXP: 100,
    breakdown: {}
  }))
}))

describe('POST /api/multiplayer-results', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should process multiplayer results successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/multiplayer-results', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: 'test-session-id',
        room_id: 'test-room-id',
        player_results: [
          {
            user_id: 'user1',
            score: 100,
            questions_answered: 10,
            correct_answers: 8,
            total_time: 300,
            average_time_per_question: 30
          },
          {
            user_id: 'user2',
            score: 80,
            questions_answered: 10,
            correct_answers: 6,
            total_time: 350,
            average_time_per_question: 35
          }
        ]
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.results).toBeDefined()
    expect(Array.isArray(data.results)).toBe(true)
    expect(data.results.length).toBe(2)
    
    // Check rankings
    expect(data.results[0].rank).toBe(1)
    expect(data.results[0].score).toBe(100)
  })

  it('should return 400 when required fields are missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/multiplayer-results', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: 'test-session-id'
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('required')
  })

  it('should return 401 when user is not authenticated', async () => {
    const supabaseModule = await import('@/lib/supabase/server')
    const mockCreateClient = supabaseModule.createClient as jest.Mock
    mockCreateClient.mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' }
        })
      }
    })

    const request = new NextRequest('http://localhost:3000/api/multiplayer-results', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: 'test-session-id',
        room_id: 'test-room-id',
        player_results: []
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should handle ties in rankings correctly', async () => {
    const request = new NextRequest('http://localhost:3000/api/multiplayer-results', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: 'test-session-id',
        room_id: 'test-room-id',
        player_results: [
          {
            user_id: 'user1',
            score: 100,
            questions_answered: 10,
            correct_answers: 8,
            total_time: 300,
            average_time_per_question: 30
          },
          {
            user_id: 'user2',
            score: 100,
            questions_answered: 10,
            correct_answers: 8,
            total_time: 310,
            average_time_per_question: 31
          }
        ]
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results.length).toBe(2)
    // Both should have rank 1 (tie)
    expect(data.results[0].rank).toBe(1)
    expect(data.results[1].rank).toBe(1)
  })
})

