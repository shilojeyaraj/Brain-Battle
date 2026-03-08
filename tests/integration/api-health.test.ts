/**
 * Integration test for the /api/health endpoint.
 *
 * Uses node test environment since Next.js route handlers require
 * Web API globals (Request, Response) that jsdom doesn't provide.
 *
 * @jest-environment node
 */
import { GET } from '@/app/api/health/route'

// Mock Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'

const mockCreateClient = createClient as jest.Mock

describe('GET /api/health', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns 200 with healthy status when database is reachable', async () => {
    mockCreateClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          limit: () => Promise.resolve({ data: [{ count: 1 }], error: null }),
        }),
      }),
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('healthy')
    expect(body).toHaveProperty('timestamp')
    expect(body).toHaveProperty('uptime')
    expect(body).toHaveProperty('checks')
    expect(body.checks.database.status).toBe('healthy')
    expect(body.checks.api.status).toBe('healthy')
  })

  it('returns 503 with degraded status when database is unreachable', async () => {
    mockCreateClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          limit: () => Promise.resolve({ data: null, error: { message: 'connection refused' } }),
        }),
      }),
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.status).toBe('degraded')
    expect(body.checks.database.status).toBe('unhealthy')
    expect(body.checks.database.error).toBe('connection refused')
  })

  it('returns 503 when an exception is thrown', async () => {
    mockCreateClient.mockRejectedValue(new Error('network timeout'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.status).toBe('unhealthy')
    expect(body.checks.api.status).toBe('unhealthy')
  })

  it('includes version and environment in response', async () => {
    mockCreateClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    })

    const response = await GET()
    const body = await response.json()

    expect(body).toHaveProperty('version')
    expect(body).toHaveProperty('environment')
  })

  it('reports responseTime as a number', async () => {
    mockCreateClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    })

    const response = await GET()
    const body = await response.json()

    expect(typeof body.checks.database.responseTime).toBe('number')
    expect(typeof body.checks.api.responseTime).toBe('number')
  })
})
