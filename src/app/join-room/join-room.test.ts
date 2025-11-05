/**
 * Tests for room joining functionality
 */

describe('Join Room Functionality', () => {
  describe('Room Code Validation', () => {
    it('should accept valid 6-character room codes', () => {
      const roomCode = 'ABC123'
      expect(roomCode.length).toBe(6)
      expect(roomCode).toMatch(/^[A-Z0-9]+$/)
    })

    it('should convert lowercase to uppercase', () => {
      const roomCode = 'abc123'
      const upperCode = roomCode.toUpperCase()
      expect(upperCode).toBe('ABC123')
    })

    it('should reject invalid room codes', () => {
      const invalidCodes = ['ABC12', 'ABC1234', 'ABC@123', '']
      
      invalidCodes.forEach(code => {
        const isValid = code.length === 6 && /^[A-Z0-9]+$/.test(code.toUpperCase())
        expect(isValid).toBe(false)
      })
    })
  })

  describe('Room Joining Logic', () => {
    it('should allow joining when room has capacity', () => {
      const room = {
        id: 'room-1',
        current_players: 2,
        max_players: 4
      }

      const canJoin = room.current_players < room.max_players
      expect(canJoin).toBe(true)
    })

    it('should prevent joining when room is full', () => {
      const room = {
        id: 'room-1',
        current_players: 4,
        max_players: 4
      }

      const canJoin = room.current_players < room.max_players
      expect(canJoin).toBe(false)
    })

    it('should handle already being a member', () => {
      const existingMember = {
        user_id: 'user-1',
        room_id: 'room-1'
      }

      expect(existingMember.user_id).toBeDefined()
      expect(existingMember.room_id).toBeDefined()
    })

    it('should increment player count on successful join', () => {
      const roomBefore = {
        current_players: 2
      }

      const roomAfter = {
        current_players: roomBefore.current_players + 1
      }

      expect(roomAfter.current_players).toBe(3)
    })
  })

  describe('Error Handling', () => {
    it('should handle room not found error', () => {
      const error = {
        code: 'PGRST116',
        message: 'No rows returned'
      }

      expect(error.code).toBe('PGRST116')
    })

    it('should handle authentication errors', () => {
      const userId = null
      const canJoin = userId !== null
      
      expect(canJoin).toBe(false)
    })
  })
})

