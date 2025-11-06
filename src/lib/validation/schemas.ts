import { z } from 'zod'

/**
 * Validation schemas for all user inputs
 * Use these with Zod to validate and sanitize data
 */

// User registration
export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(5, 'Email must be at least 5 characters')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    )
    .trim(),
})

// User login
export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
})

// Room creation
export const createRoomSchema = z.object({
  name: z
    .string()
    .min(1, 'Room name is required')
    .max(100, 'Room name must be less than 100 characters')
    .trim(),
  is_private: z.boolean().default(true),
  subject: z.string().max(100, 'Subject must be less than 100 characters').trim().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  max_players: z.number().int().min(2).max(20).default(4),
  time_limit: z.number().int().min(10).max(300).default(30),
  total_questions: z.number().int().min(1).max(50).default(10),
})

// Join room
export const joinRoomSchema = z.object({
  room_code: z
    .string()
    .length(6, 'Room code must be 6 characters')
    .regex(/^[A-Z0-9]+$/, 'Room code must contain only uppercase letters and numbers')
    .toUpperCase(),
})

// Quiz generation
export const generateQuizSchema = z.object({
  room_id: z.string().uuid('Invalid room ID'),
  unit_id: z.string().uuid('Invalid unit ID').optional(),
  total_questions: z.number().int().min(1).max(50).default(10),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  time_limit: z.number().int().min(10).max(300).default(30),
})

// Answer submission
export const submitAnswerSchema = z.object({
  session_id: z.string().uuid('Invalid session ID'),
  question_id: z.union([z.string().uuid(), z.number()]),
  answer: z.string().min(1, 'Answer is required').max(1000, 'Answer too long'),
})

// File upload
export const fileUploadSchema = z.object({
  room_id: z.string().uuid('Invalid room ID'),
  file: z.instanceof(File, { message: 'File is required' }),
  title: z.string().max(255, 'Title must be less than 255 characters').trim().optional(),
})

// User stats query
export const userStatsSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
})

// Search query
export const searchSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query is required')
    .max(500, 'Search query must be less than 500 characters')
    .trim(),
  limit: z.number().int().min(1).max(100).default(10),
})

// Profile update
export const updateProfileSchema = z.object({
  display_name: z
    .string()
    .min(1, 'Display name is required')
    .max(50, 'Display name must be less than 50 characters')
    .trim(),
  avatar_url: z.string().url('Invalid URL').optional(),
})

// Cheat event
export const cheatEventSchema = z.object({
  room_id: z.string().uuid('Invalid room ID'),
  user_id: z.string().uuid('Invalid user ID'),
  violation_type: z.enum(['tab_switch', 'window_blur', 'visibility_change']),
  duration_seconds: z.number().int().min(0).max(3600),
  timestamp: z.string().datetime('Invalid timestamp'),
})

// Session event
export const sessionEventSchema = z.object({
  session_id: z.string().uuid('Invalid session ID'),
  type: z.string().min(1).max(50),
  payload: z.record(z.any()),
})

/**
 * Validate and sanitize input data
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  error?: string
} {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map((e) => e.message).join(', '),
      }
    }
    return {
      success: false,
      error: 'Validation failed',
    }
  }
}

/**
 * Sanitize string inputs (remove HTML, trim, etc.)
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 10000) // Limit length
}

/**
 * Validate file upload
 */
export function validateFile(file: File): {
  valid: boolean
  error?: string
} {
  const maxSize = 10 * 1024 * 1024 // 10MB
  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size must be less than 10MB',
    }
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'File type not allowed. Only PDF, DOC, DOCX, and TXT files are allowed.',
    }
  }

  // Sanitize filename
  const sanitizedName = sanitizeString(file.name)
  if (sanitizedName !== file.name) {
    return {
      valid: false,
      error: 'Invalid filename',
    }
  }

  return { valid: true }
}

