/**
 * Environment variable validation
 * Validates all required environment variables on startup
 */

import { z } from 'zod'

// Define the schema for environment variables
const envSchema = z.object({
  // Public variables
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().min(1),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  
  // Server-side variables
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPEN_ROUTER_KEY: z.string().min(1), // OpenRouter API key (used for Moonshot models)
  SESSION_SECRET: z.string().min(1).optional(), // Optional in dev, required in production
  
  // Optional variables
  OPENAI_API_KEY: z.string().optional(), // Optional - only needed for parallel testing or fallback
  ADMIN_PASSWORD: z.string().optional(), // Optional - admin panel password
  COOKIE_DOMAIN: z.string().optional(), // Optional - for custom domains
  MOONSHOT_MODEL: z.string().optional(), // Optional - override default model (maps to OpenRouter Moonshot models)
  OPENROUTER_MODEL: z.string().optional(), // Optional - OpenRouter model name override
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  VERCEL_URL: z.string().optional(),
})

// Validate environment variables
function validateEnv() {
  try {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      OPEN_ROUTER_KEY: process.env.OPEN_ROUTER_KEY,
      SESSION_SECRET: process.env.SESSION_SECRET,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
      COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
      MOONSHOT_MODEL: process.env.MOONSHOT_MODEL,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
    }
    
    const result = envSchema.parse(env)
    
    // Additional validation: SESSION_SECRET required in production
    if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
      throw new Error(
        '❌ SESSION_SECRET is required in production. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
      )
    }
    
    // Warn if using default SESSION_SECRET in production
    if (process.env.NODE_ENV === 'production' && 
        process.env.SESSION_SECRET === 'your-secret-key-change-in-production') {
      console.warn('⚠️ [ENV] Using default SESSION_SECRET in production! This is insecure!')
    }
    
    return result
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors.map(e => e.path.join('.')).join(', ')
      throw new Error(
        `❌ Missing or invalid environment variables: ${missing}\n` +
        `Please check your .env.local file and ensure all required variables are set.`
      )
    }
    throw error
  }
}

// Export validated environment variables
export const env = validateEnv()

// Helper to check if we're in production
export const isProduction = env.NODE_ENV === 'production'
export const isDevelopment = env.NODE_ENV === 'development'
export const isTest = env.NODE_ENV === 'test'

