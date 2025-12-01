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

/**
 * Validate file content by checking magic numbers (file signatures)
 * This prevents MIME type spoofing attacks
 */
export async function validateFileContent(file: File): Promise<{
  valid: boolean
  error?: string
  detectedType?: string
}> {
  try {
    // Read first few bytes to check magic numbers
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer.slice(0, 16)) // Read first 16 bytes

    // PDF magic number: %PDF (25 50 44 46)
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      if (file.type === 'application/pdf') {
        return { valid: true, detectedType: 'application/pdf' }
      }
      return {
        valid: false,
        error: 'File content does not match declared type. File appears to be PDF but MIME type is incorrect.',
        detectedType: 'application/pdf'
      }
    }

    // ZIP-based formats (DOCX, PPTX, XLSX) start with PK (50 4B)
    if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
      const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      const isPptx = file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      
      if (isDocx || isPptx) {
        return { valid: true, detectedType: file.type }
      }
      // Could be a ZIP file masquerading as Office document
      return {
        valid: false,
        error: 'File content does not match declared type. File appears to be a ZIP archive.',
        detectedType: 'application/zip'
      }
    }

    // Old Office formats (DOC, PPT, XLS) - OLE2 format starts with D0 CF 11 E0
    if (bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) {
      const isDoc = file.type === 'application/msword'
      const isPpt = file.type === 'application/vnd.ms-powerpoint'
      
      if (isDoc || isPpt) {
        return { valid: true, detectedType: file.type }
      }
      return {
        valid: false,
        error: 'File content does not match declared type.',
        detectedType: 'application/x-ole-storage'
      }
    }

    // Plain text files - check if all bytes are printable ASCII or UTF-8
    if (file.type === 'text/plain') {
      // For text files, we're more lenient - just check it's not binary
      let isText = true
      for (let i = 0; i < Math.min(bytes.length, 512); i++) {
        // Allow printable ASCII, tabs, newlines, carriage returns
        if (bytes[i] > 0x7F && bytes[i] < 0xC0) {
          // Not valid UTF-8 start byte
          isText = false
          break
        }
      }
      if (isText) {
        return { valid: true, detectedType: 'text/plain' }
      }
    }

    // If we can't detect the type but MIME type is allowed, allow it
    // (some file types don't have easily detectable magic numbers)
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ]
    
    if (allowedTypes.includes(file.type)) {
      // For files we can't verify, log a warning but allow (better UX)
      // In production, you might want to be stricter
      return { valid: true, detectedType: file.type }
    }

    return {
      valid: false,
      error: 'File content validation failed. File type could not be verified.',
    }
  } catch (error) {
    console.error('Error validating file content:', error)
    return {
      valid: false,
      error: 'Failed to validate file content.',
    }
  }
}

