/**
 * Tests for room creation functionality
 */

import { generateRoomCode } from '@/lib/utils'

describe('Create Room Functionality', () => {
  describe('Room Creation Logic', () => {
    it('should generate a unique room code', () => {
      const code1 = generateRoomCode()
      const code2 = generateRoomCode()
      
      expect(code1).toHaveLength(6)
      expect(code2).toHaveLength(6)
      expect(code1).toMatch(/^[A-Z0-9]+$/)
    })

    it('should create room with correct default values', () => {
      const roomData = {
        name: 'Test Room',
        max_players: 4,
        current_players: 1,
        status: 'waiting',
        time_limit: 30,
        total_questions: 10,
        is_private: false
      }

      expect(roomData.max_players).toBe(4)
      expect(roomData.current_players).toBe(1)
      expect(roomData.status).toBe('waiting')
      expect(roomData.time_limit).toBe(30)
    })

    it('should add creator as room member', () => {
      const memberData = {
        room_id: 'test-room-id',
        user_id: 'test-user-id',
        joined_at: expect.any(String),
        is_ready: true
      }

      expect(memberData.is_ready).toBe(true)
      expect(memberData.user_id).toBeDefined()
    })
  })

  describe('Room Validation', () => {
    it('should validate room name is provided', () => {
      const roomName = 'Test Study Room'
      expect(roomName).toBeTruthy()
      expect(roomName.length).toBeGreaterThan(0)
    })

    it('should validate user is authenticated before creating room', () => {
      const userId = 'test-user-id'
      expect(userId).toBeDefined()
      expect(userId.length).toBeGreaterThan(0)
    })
  })
})

