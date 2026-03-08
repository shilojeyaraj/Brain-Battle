import { sanitizeError, sanitizeDatabaseError, createSafeErrorResponse } from './error-sanitizer'

// Suppress console.error in tests
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  jest.restoreAllMocks()
})

describe('sanitizeError', () => {
  it('classifies SQL/database errors', () => {
    const result = sanitizeError(new Error('SQL syntax error near SELECT'))
    expect(result.code).toBe('DATABASE_ERROR')
    expect(result.statusCode).toBe(500)
    expect(result.message).not.toContain('SQL')
  })

  it('classifies file/upload errors', () => {
    const result = sanitizeError(new Error('file upload failed'))
    expect(result.code).toBe('FILE_ERROR')
    expect(result.statusCode).toBe(400)
  })

  it('classifies authentication errors', () => {
    const result = sanitizeError(new Error('authentication required'))
    expect(result.code).toBe('UNAUTHORIZED')
    expect(result.statusCode).toBe(401)
  })

  it('classifies validation errors', () => {
    const result = sanitizeError(new Error('validation failed: invalid email'))
    expect(result.code).toBe('VALIDATION_ERROR')
    expect(result.statusCode).toBe(400)
  })

  it('returns generic error for unknown Error types', () => {
    const result = sanitizeError(new Error('something weird'))
    expect(result.code).toBe('INTERNAL_ERROR')
    expect(result.statusCode).toBe(500)
  })

  it('returns UNKNOWN_ERROR for non-Error types', () => {
    const result = sanitizeError('string error')
    expect(result.code).toBe('UNKNOWN_ERROR')
    expect(result.statusCode).toBe(500)
  })

  it('uses custom default message', () => {
    const result = sanitizeError('oops', 'Custom fallback')
    expect(result.message).toBe('Custom fallback')
  })

  it('never leaks internal details in message', () => {
    const result = sanitizeError(new Error('SQL injection at /var/task/node_modules/pg'))
    expect(result.message).not.toContain('/var/task')
    expect(result.message).not.toContain('node_modules')
  })
})

describe('sanitizeDatabaseError', () => {
  it('maps known Postgres error codes', () => {
    expect(sanitizeDatabaseError({ code: '23505' }).statusCode).toBe(409)
    expect(sanitizeDatabaseError({ code: '23502' }).statusCode).toBe(400)
    expect(sanitizeDatabaseError({ code: 'PGRST116' }).statusCode).toBe(404)
    expect(sanitizeDatabaseError({ code: '23503' }).statusCode).toBe(400)
  })

  it('returns generic database error for unknown codes', () => {
    const result = sanitizeDatabaseError({ code: '99999', message: 'unknown' })
    expect(result.code).toBe('DATABASE_ERROR')
    expect(result.statusCode).toBe(500)
  })

  it('handles null/undefined errors', () => {
    const result = sanitizeDatabaseError(null)
    expect(result.statusCode).toBe(500)
  })
})

describe('createSafeErrorResponse', () => {
  it('returns object with error and code fields', () => {
    const result = createSafeErrorResponse(new Error('test'))
    expect(result).toHaveProperty('error')
    expect(result).toHaveProperty('code')
    expect(typeof result.error).toBe('string')
  })

  it('uses custom default message', () => {
    const result = createSafeErrorResponse('err', 'Something failed')
    expect(result.error).toBe('Something failed')
  })
})
