// Mock NextRequest and dependencies before importing
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((body, init) => ({
      json: async () => body,
      status: init?.status || 200,
      ok: (init?.status || 200) < 400
    }))
  }
}))

// Mock global fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({ results: [] })
  })
) as jest.Mock

// Mock dependencies
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                questions: [
                  {
                    id: 1,
                    type: 'multiple_choice',
                    question: 'Test question?',
                    options: ['A', 'B', 'C', 'D'],
                    correct: 0,
                    explanation: 'Test explanation',
                    source_document: 'Test document'
                  }
                ]
              })
            }
          }]
        })
      }
    }
  }))
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => Promise.resolve({ error: null }))
    }))
  }))
}))

// Now import after mocks
import { POST } from './route'
import { NextRequest } from 'next/server'

describe('POST /api/generate-quiz', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should generate quiz for singleplayer with form data', async () => {
    const formData = new FormData()
    formData.append('topic', 'Physics')
    formData.append('difficulty', 'medium')
    formData.append('instructions', 'Test instructions')
    
    const request = new NextRequest('http://localhost:3000/api/generate-quiz', {
      method: 'POST',
      body: formData,
    }) as any

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.questions).toBeDefined()
    expect(Array.isArray(data.questions)).toBe(true)
  })

  it('should generate quiz for multiplayer with JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/generate-quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: 'Mathematics',
        difficulty: 'hard',
        totalQuestions: 10,
        sessionId: 'test-session-id'
      }),
    }) as any

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.questions).toBeDefined()
  })

  it('should return 400 when topic is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/generate-quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        difficulty: 'medium'
      }),
    }) as any

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('required')
  })

  it('should return 400 when difficulty is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/generate-quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: 'Science'
      }),
    }) as any

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('required')
  })
})
