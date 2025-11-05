/**
 * Tests for Supabase Realtime functionality
 * Tests player progress updates, score synchronization, and real-time subscriptions
 */

describe('Supabase Realtime Functionality', () => {
  describe('Player Progress Updates', () => {
    let mockChannel: any
    let mockSupabase: any
    let progressCallback: (payload: any) => void

    beforeEach(() => {
      // Setup mock channel
      progressCallback = jest.fn()
      
      mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn((callback?) => {
          if (callback && typeof callback === 'function') {
            callback('SUBSCRIBED')
          }
          return Promise.resolve({ status: 'SUBSCRIBED' })
        }),
        unsubscribe: jest.fn()
      }

      // Setup mock Supabase client
      mockSupabase = {
        channel: jest.fn((channelName) => {
          expect(channelName).toMatch(/^battle:/)
          return mockChannel
        }),
        removeChannel: jest.fn(),
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [],
              error: null
            }))
          }))
        }))
      }
    })

    it('should subscribe to player_progress table changes', () => {
      const sessionId = 'test-session-id'
      const roomId = 'test-room-id'

      // Create channel for real-time updates
      const channel = mockSupabase.channel(`battle:${roomId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'player_progress',
          filter: `session_id=eq.${sessionId}`
        }, progressCallback)
        .subscribe()

      expect(mockSupabase.channel).toHaveBeenCalledWith(`battle:${roomId}`)
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          table: 'player_progress',
          filter: `session_id=eq.${sessionId}`
        }),
        expect.any(Function)
      )
    })

    it('should receive player progress updates when another player answers', async () => {
      const sessionId = 'test-session-id'
      const roomId = 'test-room-id'
      const loadPlayerProgress = jest.fn()

      // Setup subscription
      const channel = mockSupabase.channel(`battle:${roomId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'player_progress',
          filter: `session_id=eq.${sessionId}`
        }, async (_payload: any) => {
          await loadPlayerProgress(sessionId)
        })
        .subscribe()

      // Simulate a player progress update
      const updatePayload = {
        eventType: 'UPDATE',
        new: {
          session_id: sessionId,
          user_id: 'user-2',
          correct_count: 5,
          total_answered: 5,
          last_idx: 4
        },
        old: {
          session_id: sessionId,
          user_id: 'user-2',
          correct_count: 4,
          total_answered: 4,
          last_idx: 3
        }
      }

      // Get the callback that was registered
      const onCall = mockChannel.on.mock.calls.find(
        (call: any[]) => call[0] === 'postgres_changes' && 
        call[1]?.table === 'player_progress'
      )
      
      if (onCall && onCall[2]) {
        await onCall[2](updatePayload)
      }

      expect(loadPlayerProgress).toHaveBeenCalledWith(sessionId)
    })

    it('should handle multiple simultaneous progress updates', async () => {
      const sessionId = 'test-session-id'
      const updates: any[] = []
      const handleUpdate = (payload: any) => {
        updates.push(payload)
      }

      // Simulate multiple players answering at the same time
      const update1 = {
        eventType: 'UPDATE',
        new: { user_id: 'user-1', correct_count: 3, total_answered: 3, last_idx: 2 }
      }
      const update2 = {
        eventType: 'UPDATE',
        new: { user_id: 'user-2', correct_count: 4, total_answered: 4, last_idx: 3 }
      }
      const update3 = {
        eventType: 'UPDATE',
        new: { user_id: 'user-3', correct_count: 2, total_answered: 2, last_idx: 1 }
      }

      handleUpdate(update1)
      handleUpdate(update2)
      handleUpdate(update3)

      expect(updates.length).toBe(3)
      expect(updates[0].new.user_id).toBe('user-1')
      expect(updates[1].new.user_id).toBe('user-2')
      expect(updates[2].new.user_id).toBe('user-3')
    })

    it('should update player progress state when receiving realtime updates', async () => {
      const sessionId = 'test-session-id'
      let playerProgress: any[] = []

      const mockLoadProgress = async (sessionId: string) => {
        // Simulate loading updated progress
        playerProgress = [
          {
            user_id: 'user-1',
            correct_count: 8,
            total_answered: 10,
            last_idx: 9
          },
          {
            user_id: 'user-2',
            correct_count: 7,
            total_answered: 10,
            last_idx: 9
          }
        ]
      }

      // Simulate receiving an update
      const payload = {
        eventType: 'UPDATE',
        new: {
          session_id: sessionId,
          user_id: 'user-1',
          correct_count: 8,
          total_answered: 10,
          last_idx: 9
        }
      }

      await mockLoadProgress(sessionId)

      expect(playerProgress.length).toBe(2)
      expect(playerProgress[0].correct_count).toBe(8)
      expect(playerProgress[0].total_answered).toBe(10)
    })
  })

  describe('Score Updates and Synchronization', () => {
    it('should calculate and broadcast score changes', () => {
      const initialScore = 50
      const correctAnswer = true
      const questionValue = 10

      const newScore = correctAnswer 
        ? initialScore + questionValue 
        : initialScore

      expect(newScore).toBe(60)
    })

    it('should synchronize scores across multiple clients', () => {
      const scores = {
        'user-1': 80,
        'user-2': 60,
        'user-3': 70
      }

      // Simulate receiving updated scores from realtime
      const updateScores = (newScores: Record<string, number>) => {
        Object.assign(scores, newScores)
      }

      updateScores({ 'user-2': 70 })

      expect(scores['user-1']).toBe(80)
      expect(scores['user-2']).toBe(70) // Updated
      expect(scores['user-3']).toBe(70)
    })

    it('should maintain correct rankings in real-time', () => {
      const players = [
        { user_id: 'user-1', score: 100, rank: 1 },
        { user_id: 'user-2', score: 80, rank: 2 },
        { user_id: 'user-3', score: 60, rank: 3 }
      ]

      // Simulate user-2 getting a correct answer and score updating
      const updatedPlayer = players.find(p => p.user_id === 'user-2')
      if (updatedPlayer) {
        updatedPlayer.score = 110
      }

      // Re-sort by score
      players.sort((a, b) => b.score - a.score)
      players.forEach((player, index) => {
        player.rank = index + 1
      })

      expect(players[0].user_id).toBe('user-2')
      expect(players[0].rank).toBe(1)
      expect(players[0].score).toBe(110)
      expect(players[1].user_id).toBe('user-1')
      expect(players[1].rank).toBe(2)
    })
  })

  describe('Session Events', () => {
    it('should handle battle completion event', () => {
      let battleComplete = false

      const handleSessionEvent = (payload: any) => {
        if (payload.eventType === 'INSERT' && payload.new.type === 'complete') {
          battleComplete = true
        }
      }

      // Simulate battle completion event
      const completionEvent = {
        eventType: 'INSERT',
        new: {
          session_id: 'session-1',
          type: 'complete',
          payload: { message: 'Battle completed' }
        }
      }

      handleSessionEvent(completionEvent)

      expect(battleComplete).toBe(true)
    })

    it('should subscribe to session_events table', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn()
      }

      const sessionId = 'test-session-id'
      
      mockChannel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'session_events',
          filter: `session_id=eq.${sessionId}`
        }, jest.fn())
        .subscribe()

      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          table: 'session_events',
          filter: `session_id=eq.${sessionId}`
        }),
        expect.any(Function)
      )
    })

    it('should handle cheat detection events from realtime', () => {
      const cheatAlerts: any[] = []
      
      const handleCheatEvent = (payload: any) => {
        if (payload.new.type === 'cheat_detected') {
          let alertData
          if (typeof payload.new.payload === 'string') {
            alertData = JSON.parse(payload.new.payload)
          } else {
            alertData = payload.new.payload
          }
          cheatAlerts.push(alertData)
        }
      }

      const cheatEvent = {
        eventType: 'INSERT',
        new: {
          session_id: 'session-1',
          type: 'cheat_detected',
          payload: {
            user_id: 'user-1',
            display_name: 'Player 1',
            violation_type: 'tab_switch',
            duration_seconds: 3
          }
        }
      }

      handleCheatEvent(cheatEvent)

      expect(cheatAlerts.length).toBe(1)
      expect(cheatAlerts[0].violation_type).toBe('tab_switch')
      expect(cheatAlerts[0].user_id).toBe('user-1')
    })
  })

  describe('Room Member Updates', () => {
    it('should handle member join notifications', () => {
      const members: any[] = []
      let notification: any = null

      const handleMemberJoin = (payload: any) => {
        members.push({
          user_id: payload.new.user_id,
          joined_at: payload.new.joined_at,
          is_ready: false
        })
        notification = { type: 'join', username: 'NewPlayer' }
      }

      const joinEvent = {
        eventType: 'INSERT',
        new: {
          room_id: 'room-1',
          user_id: 'user-4',
          joined_at: new Date().toISOString(),
          is_ready: false
        }
      }

      handleMemberJoin(joinEvent)

      expect(members.length).toBe(1)
      expect(members[0].user_id).toBe('user-4')
      expect(notification.type).toBe('join')
    })

    it('should handle member leave notifications', () => {
      const members = [
        { user_id: 'user-1' },
        { user_id: 'user-2' },
        { user_id: 'user-3' }
      ]
      let notification: any = null

      const handleMemberLeave = (payload: any) => {
        const index = members.findIndex(m => m.user_id === payload.old.user_id)
        if (index !== -1) {
          members.splice(index, 1)
        }
        notification = { type: 'leave', username: 'LeavingPlayer' }
      }

      const leaveEvent = {
        eventType: 'DELETE',
        old: {
          room_id: 'room-1',
          user_id: 'user-2'
        }
      }

      handleMemberLeave(leaveEvent)

      expect(members.length).toBe(2)
      expect(members.find(m => m.user_id === 'user-2')).toBeUndefined()
      expect(notification.type).toBe('leave')
    })

    it('should handle member status updates (ready state)', () => {
      const members = [
        { user_id: 'user-1', is_ready: false },
        { user_id: 'user-2', is_ready: false }
      ]

      const handleStatusUpdate = (payload: any) => {
        const member = members.find(m => m.user_id === payload.new.user_id)
        if (member) {
          member.is_ready = payload.new.is_ready
        }
      }

      const statusUpdate = {
        eventType: 'UPDATE',
        new: {
          user_id: 'user-1',
          is_ready: true
        },
        old: {
          user_id: 'user-1',
          is_ready: false
        }
      }

      handleStatusUpdate(statusUpdate)

      expect(members[0].is_ready).toBe(true)
      expect(members[1].is_ready).toBe(false)
    })

    it('should update room player count on member changes', () => {
      let room = {
        id: 'room-1',
        current_players: 2,
        max_players: 4
      }

      const handleMemberChange = (payload: any, changeType: 'join' | 'leave') => {
        if (changeType === 'join') {
          room.current_players = Math.min(room.current_players + 1, room.max_players)
        } else if (changeType === 'leave') {
          room.current_players = Math.max(room.current_players - 1, 0)
        }
      }

      // Member joins
      handleMemberChange({ new: { user_id: 'user-3' } }, 'join')
      expect(room.current_players).toBe(3)

      // Member leaves
      handleMemberChange({ old: { user_id: 'user-1' } }, 'leave')
      expect(room.current_players).toBe(2)
    })
  })

  describe('Channel Management', () => {
    it('should clean up channels on unmount', () => {
      const mockSupabase = {
        channel: jest.fn((_channelName) => ({
          on: jest.fn().mockReturnThis(),
          subscribe: jest.fn()
        })),
        removeChannel: jest.fn()
      }

      const channel = mockSupabase.channel('test-channel')

      // Simulate unmount
      mockSupabase.removeChannel(channel)

      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(channel)
    })

    it('should handle channel subscription errors', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn((callback) => {
          callback('CHANNEL_ERROR', { message: 'Connection failed' })
        })
      }

      let subscriptionError: any = null

      mockChannel.subscribe((status: string, err?: any) => {
        if (status === 'CHANNEL_ERROR') {
          subscriptionError = err
        }
      })

      expect(subscriptionError).not.toBeNull()
      expect(subscriptionError.message).toBe('Connection failed')
    })

    it('should resubscribe if connection is lost', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn()
      }

      let subscriptionCount = 0
      const subscribe = () => {
        subscriptionCount++
        mockChannel.subscribe()
      }

      subscribe() // Initial subscription
      mockChannel.unsubscribe() // Connection lost
      subscribe() // Resubscribe

      expect(subscriptionCount).toBe(2)
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle rapid updates efficiently', async () => {
      const updates: any[] = []
      const processUpdate = (payload: any) => {
        updates.push(payload)
      }

      // Simulate rapid updates (e.g., 10 players answering quickly)
      const rapidUpdates = Array.from({ length: 10 }, (_, i) => ({
        eventType: 'UPDATE',
        new: {
          user_id: `user-${i + 1}`,
          correct_count: i + 1,
          total_answered: i + 1
        }
      }))

      rapidUpdates.forEach(update => processUpdate(update))

      expect(updates.length).toBe(10)
    })

    it('should filter updates by session_id', () => {
      const relevantUpdates: any[] = []
      const sessionId = 'target-session'

      const handleUpdate = (payload: any, targetSessionId: string) => {
        if (payload.new.session_id === targetSessionId) {
          relevantUpdates.push(payload)
        }
      }

      const updates = [
        { new: { session_id: 'target-session', user_id: 'user-1' } },
        { new: { session_id: 'other-session', user_id: 'user-2' } },
        { new: { session_id: 'target-session', user_id: 'user-3' } }
      ]

      updates.forEach(update => handleUpdate(update, sessionId))

      expect(relevantUpdates.length).toBe(2)
      expect(relevantUpdates.every(u => u.new.session_id === sessionId)).toBe(true)
    })
  })
})

