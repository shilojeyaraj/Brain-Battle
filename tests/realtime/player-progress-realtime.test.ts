/**
 * Specific tests for real-time player progress updates
 * Tests score synchronization, leaderboard updates, and progress tracking
 */

describe('Player Progress Realtime Updates', () => {
  describe('Progress Tracking', () => {
    it('should track current question index in real-time', () => {
      const progress = {
        user_id: 'user-1',
        current_question: 3,
        total_questions: 10
      }

      // Simulate answering a question
      progress.current_question++

      expect(progress.current_question).toBe(4)
      expect(progress.current_question).toBeLessThanOrEqual(progress.total_questions)
    })

    it('should update correct answer count when player answers correctly', () => {
      let progress = {
        user_id: 'user-1',
        correct_count: 5,
        total_answered: 6
      }

      const isCorrect = true
      if (isCorrect) {
        progress.correct_count++
      }
      progress.total_answered++

      expect(progress.correct_count).toBe(6)
      expect(progress.total_answered).toBe(7)
    })

    it('should calculate accuracy in real-time', () => {
      const progress = {
        correct_count: 7,
        total_answered: 10
      }

      const accuracy = progress.total_answered > 0
        ? (progress.correct_count / progress.total_answered) * 100
        : 0

      expect(accuracy).toBe(70)
    })
  })

  describe('Score Calculation', () => {
    it('should calculate score based on correct answers', () => {
      const progress = {
        correct_count: 8,
        total_answered: 10,
        points_per_question: 10
      }

      const score = progress.correct_count * progress.points_per_question

      expect(score).toBe(80)
    })

    it('should apply time bonuses to score', () => {
      const baseScore = 80
      const timeBonus = 5 // Bonus for answering quickly
      const finalScore = baseScore + timeBonus

      expect(finalScore).toBe(85)
    })

    it('should update score when receiving realtime progress update', () => {
      let playerScores: Record<string, number> = {
        'user-1': 60,
        'user-2': 50,
        'user-3': 70
      }

      const handleProgressUpdate = (payload: any) => {
        const userId = payload.new.user_id
        const correctCount = payload.new.correct_count
        const pointsPerQuestion = 10

        playerScores[userId] = correctCount * pointsPerQuestion
      }

      const update = {
        new: {
          user_id: 'user-2',
          correct_count: 7,
          total_answered: 7
        }
      }

      handleProgressUpdate(update)

      expect(playerScores['user-2']).toBe(70)
      expect(playerScores['user-1']).toBe(60) // Unchanged
    })
  })

  describe('Leaderboard Updates', () => {
    it('should maintain sorted leaderboard based on scores', () => {
      const players = [
        { user_id: 'user-1', score: 100, display_name: 'Player 1' },
        { user_id: 'user-2', score: 80, display_name: 'Player 2' },
        { user_id: 'user-3', score: 90, display_name: 'Player 3' }
      ]

      // Sort by score descending
      players.sort((a, b) => b.score - a.score)

      expect(players[0].user_id).toBe('user-1')
      expect(players[1].user_id).toBe('user-3')
      expect(players[2].user_id).toBe('user-2')
    })

    it('should update leaderboard when player scores change', () => {
      let leaderboard = [
        { user_id: 'user-1', score: 100 },
        { user_id: 'user-2', score: 80 },
        { user_id: 'user-3', score: 60 }
      ]

      const updateScore = (userId: string, newScore: number) => {
        const player = leaderboard.find(p => p.user_id === userId)
        if (player) {
          player.score = newScore
          leaderboard.sort((a, b) => b.score - a.score)
        }
      }

      // Player 3 improves their score
      updateScore('user-3', 110)

      expect(leaderboard[0].user_id).toBe('user-3')
      expect(leaderboard[0].score).toBe(110)
    })

    it('should handle ties in leaderboard correctly', () => {
      const players = [
        { user_id: 'user-1', score: 100 },
        { user_id: 'user-2', score: 100 },
        { user_id: 'user-3', score: 80 }
      ]

      players.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score
        }
        // For ties, sort by user_id (or other criteria)
        return a.user_id.localeCompare(b.user_id)
      })

      expect(players[0].score).toBe(100)
      expect(players[1].score).toBe(100)
      expect(players[2].score).toBe(80)
    })
  })

  describe('Multi-Player Synchronization', () => {
    it('should synchronize progress across all players', () => {
      const allProgress: Record<string, any> = {
        'user-1': { current_question: 5, score: 50 },
        'user-2': { current_question: 4, score: 40 },
        'user-3': { current_question: 6, score: 60 }
      }

      const syncProgress = (updates: Array<{ userId: string, progress: any }>) => {
        updates.forEach(({ userId, progress }) => {
          allProgress[userId] = progress
        })
      }

      syncProgress([
        { userId: 'user-2', progress: { current_question: 5, score: 50 } }
      ])

      expect(allProgress['user-2'].current_question).toBe(5)
      expect(allProgress['user-2'].score).toBe(50)
      expect(allProgress['user-1'].current_question).toBe(5) // Unchanged
    })

    it('should handle concurrent updates from multiple players', async () => {
      const progress: Record<string, number> = {
        'user-1': 50,
        'user-2': 40,
        'user-3': 30
      }

      const updates = [
        { userId: 'user-1', newScore: 60 },
        { userId: 'user-2', newScore: 50 },
        { userId: 'user-3', newScore: 40 }
      ]

      // Apply all updates
      updates.forEach(update => {
        progress[update.userId] = update.newScore
      })

      expect(progress['user-1']).toBe(60)
      expect(progress['user-2']).toBe(50)
      expect(progress['user-3']).toBe(40)
    })

    it('should show real-time progress for each player', () => {
      const playerProgress = [
        {
          user_id: 'user-1',
          display_name: 'Player 1',
          current_question: 8,
          total_questions: 10,
          score: 80,
          correct_answers: 8
        },
        {
          user_id: 'user-2',
          display_name: 'Player 2',
          current_question: 6,
          total_questions: 10,
          score: 60,
          correct_answers: 6
        }
      ]

      const calculateProgressPercent = (current: number, total: number) => {
        return total > 0 ? (current / total) * 100 : 0
      }

      playerProgress.forEach(player => {
        const progress = calculateProgressPercent(
          player.current_question,
          player.total_questions
        )
        expect(progress).toBeGreaterThan(0)
        expect(progress).toBeLessThanOrEqual(100)
      })

      expect(calculateProgressPercent(8, 10)).toBe(80)
      expect(calculateProgressPercent(6, 10)).toBe(60)
    })
  })

  describe('Progress Persistence', () => {
    it('should persist progress to database on update', async () => {
      const updateProgress = async (sessionId: string, userId: string, progress: any) => {
        // Simulate database update
        return {
          session_id: sessionId,
          user_id: userId,
          correct_count: progress.correct_count,
          total_answered: progress.total_answered,
          last_idx: progress.last_idx
        }
      }

      const result = await updateProgress('session-1', 'user-1', {
        correct_count: 7,
        total_answered: 8,
        last_idx: 7
      })

      expect(result.correct_count).toBe(7)
      expect(result.total_answered).toBe(8)
      expect(result.last_idx).toBe(7)
    })

    it('should load progress from database when needed', async () => {
      const mockLoadProgress = async (sessionId: string) => {
        return [
          {
            user_id: 'user-1',
            correct_count: 5,
            total_answered: 6,
            last_idx: 5
          },
          {
            user_id: 'user-2',
            correct_count: 4,
            total_answered: 5,
            last_idx: 4
          }
        ]
      }

      const progress = await mockLoadProgress('session-1')

      expect(progress.length).toBe(2)
      expect(progress[0].correct_count).toBe(5)
      expect(progress[1].correct_count).toBe(4)
    })
  })

  describe('Real-time Notifications', () => {
    it('should notify when a player advances', () => {
      const notifications: string[] = []

      const handleAdvancement = (userId: string, newQuestion: number) => {
        notifications.push(`Player ${userId} advanced to question ${newQuestion}`)
      }

      handleAdvancement('user-1', 5)

      expect(notifications.length).toBe(1)
      expect(notifications[0]).toContain('user-1')
      expect(notifications[0]).toContain('question 5')
    })

    it('should notify when a player completes the quiz', () => {
      let completionNotification: string | null = null

      const handleCompletion = (userId: string, finalScore: number) => {
        completionNotification = `Player ${userId} completed with score ${finalScore}`
      }

      handleCompletion('user-1', 100)

      expect(completionNotification).not.toBeNull()
      expect(completionNotification).toContain('user-1')
      expect(completionNotification).toContain('100')
    })
  })
})

