/**
 * Security: Sanitize error messages before sending to client
 * Prevents information leakage about internal system details
 */

export interface SanitizedError {
  message: string
  code?: string
  statusCode: number
}

/**
 * Sanitize error messages for client responses
 * Logs detailed errors server-side but returns generic messages to clients
 */
export function sanitizeError(error: unknown, defaultMessage: string = 'An error occurred'): SanitizedError {
  // Log full error details server-side
  console.error('❌ [ERROR] Full error details:', error)

  // Return sanitized error for client
  if (error instanceof Error) {
    // Check for known error types
    if (error.message.includes('SQL') || error.message.includes('database')) {
      return {
        message: 'Database error. Please try again.',
        code: 'DATABASE_ERROR',
        statusCode: 500,
      }
    }

    if (error.message.includes('file') || error.message.includes('upload')) {
      return {
        message: 'File processing error. Please check your file and try again.',
        code: 'FILE_ERROR',
        statusCode: 400,
      }
    }

    if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
      return {
        message: 'Authentication required. Please log in.',
        code: 'UNAUTHORIZED',
        statusCode: 401,
      }
    }

    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return {
        message: 'Invalid input. Please check your data and try again.',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      }
    }

    // Generic error for unknown cases
    return {
      message: defaultMessage,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    }
  }

  // Unknown error type
  return {
    message: defaultMessage,
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
  }
}

/**
 * Sanitize database error messages
 */
export function sanitizeDatabaseError(error: any): SanitizedError {
  console.error('❌ [DATABASE ERROR] Full details:', {
    code: error?.code,
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
  })

  // Map known database error codes to user-friendly messages
  const errorCodeMap: Record<string, { message: string; statusCode: number }> = {
    '23503': { message: 'Invalid reference. Please check your data.', statusCode: 400 },
    '23505': { message: 'This record already exists.', statusCode: 409 },
    '23502': { message: 'Required field is missing.', statusCode: 400 },
    'PGRST116': { message: 'Record not found.', statusCode: 404 },
  }

  if (error?.code && errorCodeMap[error.code]) {
    return {
      message: errorCodeMap[error.code].message,
      code: error.code,
      statusCode: errorCodeMap[error.code].statusCode,
    }
  }

  return {
    message: 'Database operation failed. Please try again.',
    code: 'DATABASE_ERROR',
    statusCode: 500,
  }
}

/**
 * Create a safe error response
 */
export function createSafeErrorResponse(error: unknown, defaultMessage: string = 'An error occurred') {
  const sanitized = sanitizeError(error, defaultMessage)
  return {
    error: sanitized.message,
    code: sanitized.code,
  }
}

