import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Health check endpoint for production monitoring
 * Returns the health status of the application and its dependencies
 */
export async function GET() {
  const startTime = Date.now()
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: { status: 'unknown', responseTime: 0 },
      api: { status: 'healthy', responseTime: 0 },
    },
  }

  try {
    // Check database connection
    const dbStartTime = Date.now()
    const supabase = await createClient()
    const { error: dbError } = await supabase.from('profiles').select('count').limit(1)
    const dbResponseTime = Date.now() - dbStartTime

    health.checks.database = {
      status: dbError ? 'unhealthy' : 'healthy',
      responseTime: dbResponseTime,
      error: dbError?.message,
    }

    // Overall health status
    if (dbError) {
      health.status = 'degraded'
    }

    // Check environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ]
    const missingEnvVars = requiredEnvVars.filter(
      (key) => !process.env[key]
    )

    if (missingEnvVars.length > 0) {
      health.status = 'degraded'
      health.checks.env = {
        status: 'unhealthy',
        missing: missingEnvVars,
      }
    }

    const totalResponseTime = Date.now() - startTime
    health.checks.api.responseTime = totalResponseTime

    // Return appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 503

    return NextResponse.json(health, { status: statusCode })
  } catch (error) {
    const totalResponseTime = Date.now() - startTime
    health.status = 'unhealthy'
    health.checks.api = {
      status: 'unhealthy',
      responseTime: totalResponseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    }

    return NextResponse.json(health, { status: 503 })
  }
}

