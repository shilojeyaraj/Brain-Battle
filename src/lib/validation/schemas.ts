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

// Quiz generation (for API routes)
export const generateQuizSchema = z.object({
  topic: z.string().max(500, 'Topic must be less than 500 characters').trim().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  totalQuestions: z.number().int().min(1).max(50).default(10).optional(),
  questionTypes: z.object({
    multiple_choice: z.boolean().optional(),
    open_ended: z.boolean().optional(),
    true_false: z.boolean().optional(),
  }).optional(),
  sessionId: z.string().uuid('Invalid session ID').optional(),
  instructions: z.string().max(1000, 'Instructions too long').trim().optional(),
})

// Notes generation
export const notesGenerationSchema = z.object({
  topic: z.string().max(500, 'Topic must be less than 500 characters').trim().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  instructions: z.string().max(1000, 'Instructions too long').trim().optional(),
})

// Player stats update
export const playerStatsSchema = z.object({
  stats: z.object({
    level: z.number().int().min(1).max(1000).optional(),
    xp: z.number().int().min(0).optional(),
    total_wins: z.number().int().min(0).optional(),
    total_losses: z.number().int().min(0).optional(),
    total_games: z.number().int().min(0).optional(),
    win_streak: z.number().int().min(0).optional(),
    best_streak: z.number().int().min(0).optional(),
    total_questions_answered: z.number().int().min(0).optional(),
    correct_answers: z.number().int().min(0).optional(),
    accuracy: z.number().min(0).max(100).optional(),
    average_response_time: z.number().min(0).optional(),
    favorite_subject: z.string().max(100).trim().nullable().optional(),
  }).optional(),
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

// Clan creation
export const createClanSchema = z.object({
  name: z
    .string()
    .min(3, 'Clan name must be at least 3 characters')
    .max(100, 'Clan name must be less than 100 characters')
    .trim(),
  description: z.string().max(500, 'Description too long').trim().optional(),
  is_private: z.boolean().default(true),
  max_members: z.number().int().min(2).max(100).default(50),
})

// Join clan
export const joinClanSchema = z.object({
  code: z
    .string()
    .length(8, 'Clan code must be 8 characters')
    .regex(/^[A-Z0-9]+$/, 'Clan code must contain only uppercase letters and numbers')
    .toUpperCase(),
})

// Create clan session
export const createClanSessionSchema = z.object({
  clan_id: z.string().uuid('Invalid clan ID'),
  topic: z.string().max(500, 'Topic too long').trim().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  total_questions: z.number().int().min(1).max(50).default(10),
  question_types: z.object({
    multiple_choice: z.boolean().optional(),
    open_ended: z.boolean().optional(),
    true_false: z.boolean().optional(),
  }).optional(),
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
 * Validate file upload with enhanced security
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
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ]

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size must be less than 10MB',
    }
  }

  // Check for empty files
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    }
  }

  // Validate file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'File type not allowed. Only PDF, DOC, DOCX, PPT, PPTX, and TXT files are allowed.',
    }
  }

  // Sanitize filename
  const sanitizedName = sanitizeString(file.name)
  if (sanitizedName !== file.name) {
    return {
      valid: false,
      error: 'Invalid filename. Filename contains invalid characters.',
    }
  }

  // Check filename length
  if (file.name.length > 255) {
    return {
      valid: false,
      error: 'Filename too long. Maximum 255 characters.',
    }
  }

  // Check for dangerous file extensions (even if MIME type seems safe)
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar']
  const lowerName = file.name.toLowerCase()
  if (dangerousExtensions.some(ext => lowerName.endsWith(ext))) {
    return {
      valid: false,
      error: 'File type not allowed for security reasons.',
    }
  }

  return { valid: true }
}

