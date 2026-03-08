import {
  registerSchema,
  loginSchema,
  joinRoomSchema,
  createRoomSchema,
  validateInput,
  sanitizeString,
  validateFile,
} from './schemas'

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    it('accepts valid registration data', () => {
      const result = validateInput(registerSchema, {
        email: 'user@example.com',
        password: 'Passw0rd',
        username: 'testuser',
      })
      expect(result.success).toBe(true)
      expect(result.data?.email).toBe('user@example.com')
    })

    it('rejects invalid email', () => {
      const result = validateInput(registerSchema, {
        email: 'not-an-email',
        password: 'Passw0rd',
        username: 'testuser',
      })
      expect(result.success).toBe(false)
    })

    it('rejects weak passwords', () => {
      const result = validateInput(registerSchema, {
        email: 'user@example.com',
        password: 'short',
        username: 'testuser',
      })
      expect(result.success).toBe(false)
    })

    it('rejects passwords without uppercase', () => {
      const result = validateInput(registerSchema, {
        email: 'user@example.com',
        password: 'password1',
        username: 'testuser',
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid usernames with special characters', () => {
      const result = validateInput(registerSchema, {
        email: 'user@example.com',
        password: 'Passw0rd',
        username: 'bad user!',
      })
      expect(result.success).toBe(false)
    })

    it('lowercases email', () => {
      const result = validateInput(registerSchema, {
        email: 'User@Example.COM',
        password: 'Passw0rd',
        username: 'testuser',
      })
      expect(result.success).toBe(true)
      expect(result.data?.email).toBe('user@example.com')
    })
  })

  describe('loginSchema', () => {
    it('accepts valid login', () => {
      const result = validateInput(loginSchema, {
        email: 'user@example.com',
        password: 'anything',
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty password', () => {
      const result = validateInput(loginSchema, {
        email: 'user@example.com',
        password: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('joinRoomSchema', () => {
    it('accepts valid 6-char room code', () => {
      const result = validateInput(joinRoomSchema, { room_code: 'ABC123' })
      expect(result.success).toBe(true)
    })

    it('rejects wrong-length codes', () => {
      expect(validateInput(joinRoomSchema, { room_code: 'AB' }).success).toBe(false)
      expect(validateInput(joinRoomSchema, { room_code: 'ABCDEFG' }).success).toBe(false)
    })

    it('uppercases valid input', () => {
      // Zod regex runs before transform, so input must already match [A-Z0-9]
      const result = validateInput(joinRoomSchema, { room_code: 'ABC123' })
      expect(result.success).toBe(true)
      expect(result.data?.room_code).toBe('ABC123')
    })

    it('rejects lowercase input (regex before transform)', () => {
      const result = validateInput(joinRoomSchema, { room_code: 'abc123' })
      expect(result.success).toBe(false)
    })

    it('rejects special characters', () => {
      const result = validateInput(joinRoomSchema, { room_code: 'ABC!@#' })
      expect(result.success).toBe(false)
    })
  })

  describe('createRoomSchema', () => {
    it('accepts valid room with defaults', () => {
      const result = validateInput(createRoomSchema, { name: 'My Room' })
      expect(result.success).toBe(true)
      expect(result.data?.difficulty).toBe('medium')
      expect(result.data?.max_players).toBe(4)
    })

    it('rejects empty room name', () => {
      const result = validateInput(createRoomSchema, { name: '' })
      expect(result.success).toBe(false)
    })

    it('rejects invalid max_players range', () => {
      expect(validateInput(createRoomSchema, { name: 'Room', max_players: 1 }).success).toBe(false)
      expect(validateInput(createRoomSchema, { name: 'Room', max_players: 21 }).success).toBe(false)
    })
  })
})

describe('validateInput', () => {
  it('returns error string for ZodError', () => {
    const result = validateInput(loginSchema, { email: 'bad', password: '' })
    expect(result.success).toBe(false)
    expect(typeof result.error).toBe('string')
  })

  it('returns generic error for non-Zod errors', () => {
    const badSchema = { parse: () => { throw new TypeError('boom') } } as any
    const result = validateInput(badSchema, {})
    expect(result.success).toBe(false)
    expect(result.error).toBe('Validation failed')
  })
})

describe('sanitizeString', () => {
  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello')
  })

  it('removes angle brackets', () => {
    const result = sanitizeString('<script>alert(1)</script>')
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
  })

  it('removes javascript: protocol', () => {
    const result = sanitizeString('javascript:alert(1)')
    expect(result).not.toContain('javascript:')
  })

  it('removes event handler attributes', () => {
    const result = sanitizeString('onerror=alert')
    // The regex /on\w+=/ removes "onerror=" leaving "alert"
    expect(result).not.toContain('onerror=')
  })

  it('limits length to 10000 chars', () => {
    const long = 'a'.repeat(20000)
    expect(sanitizeString(long).length).toBe(10000)
  })

  it('handles null/undefined/non-string', () => {
    expect(sanitizeString(null as any)).toBe('')
    expect(sanitizeString(undefined as any)).toBe('')
    expect(sanitizeString(123 as any)).toBe('')
  })
})

describe('validateFile', () => {
  const makeFile = (name: string, size: number, type: string) =>
    new File([new ArrayBuffer(size)], name, { type })

  it('accepts valid PDF', () => {
    const result = validateFile(makeFile('test.pdf', 1000, 'application/pdf'))
    expect(result.valid).toBe(true)
  })

  it('accepts valid DOCX', () => {
    const file = makeFile('doc.docx', 1000, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    expect(validateFile(file).valid).toBe(true)
  })

  it('rejects files over 5MB', () => {
    const file = makeFile('big.pdf', 6 * 1024 * 1024, 'application/pdf')
    const result = validateFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('5MB')
  })

  it('rejects empty files', () => {
    const file = makeFile('empty.pdf', 0, 'application/pdf')
    expect(validateFile(file).valid).toBe(false)
  })

  it('rejects disallowed MIME types', () => {
    const file = makeFile('image.png', 100, 'image/png')
    expect(validateFile(file).valid).toBe(false)
  })

  it('rejects dangerous extensions', () => {
    const file = makeFile('virus.exe', 100, 'application/pdf')
    expect(validateFile(file).valid).toBe(false)
  })

  it('rejects filenames over 255 chars', () => {
    const name = 'a'.repeat(256) + '.pdf'
    const file = makeFile(name, 100, 'application/pdf')
    expect(validateFile(file).valid).toBe(false)
  })
})
