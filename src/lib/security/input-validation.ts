/**
 * Input Validation Utilities
 * 
 * Common validation functions for API inputs
 */

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Sanitize string input (trim, limit length)
 */
export function sanitizeString(input: string | null | undefined, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') {
    return ''
  }
  return input.trim().slice(0, maxLength)
}

/**
 * Validate difficulty level
 */
export function isValidDifficulty(difficulty: string | null | undefined): difficulty is 'easy' | 'medium' | 'hard' {
  return difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard'
}

/**
 * Validate education level
 */
export function isValidEducationLevel(level: string | null | undefined): boolean {
  const validLevels = ['elementary', 'high_school', 'university', 'graduate']
  return validLevels.includes(level || '')
}

/**
 * Validate numeric input (integer, within range)
 */
export function isValidInteger(
  value: string | number | null | undefined,
  min: number = 1,
  max: number = 100
): boolean {
  if (value === null || value === undefined) {
    return false
  }
  
  const num = typeof value === 'string' ? parseInt(value, 10) : value
  
  if (isNaN(num) || !Number.isInteger(num)) {
    return false
  }
  
  return num >= min && num <= max
}

/**
 * Validate file size (in bytes)
 */
export function isValidFileSize(size: number, maxSizeBytes: number = 5 * 1024 * 1024): boolean {
  return size > 0 && size <= maxSizeBytes
}

/**
 * Validate file type by MIME type
 */
export function isValidFileType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(mimeType)
}

/**
 * Validate room code format (8 alphanumeric characters)
 */
export function isValidRoomCode(code: string | null | undefined): boolean {
  if (!code || typeof code !== 'string') {
    return false
  }
  const roomCodeRegex = /^[A-Z0-9]{8}$/
  return roomCodeRegex.test(code.toUpperCase())
}

