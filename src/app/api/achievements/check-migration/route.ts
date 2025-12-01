import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'

/**
 * GET /api/achievements/check-migration
 * Checks if achievement tables exist and provides migration status
 */
export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient()
    
    // Check if achievement_definitions table exists
    const { error: definitionsError } = await adminClient
      .from('achievement_definitions')
      .select('id')
      .limit(1)

    const definitionsExist = !definitionsError || definitionsError.code !== 'PGRST205'

    // Check if achievements table exists
    const { error: achievementsError } = await adminClient
      .from('achievements')
      .select('id')
      .limit(1)

    const achievementsExist = !achievementsError || achievementsError.code !== 'PGRST205'

    const tablesExist = definitionsExist && achievementsExist

    return NextResponse.json({
      success: true,
      tablesExist,
      definitionsTableExists: definitionsExist,
      achievementsTableExists: achievementsExist,
      message: tablesExist 
        ? 'Achievement tables exist and are ready to use'
        : 'Achievement tables do not exist. Please run the migration: supabase/migrations/create-achievements-system.sql',
      migrationFile: 'supabase/migrations/create-achievements-system.sql',
      instructions: tablesExist ? null : [
        '1. Open Supabase Dashboard',
        '2. Go to SQL Editor',
        '3. Copy and paste the contents of supabase/migrations/create-achievements-system.sql',
        '4. Run the SQL',
        '5. Refresh this page to verify'
      ]
    })
  } catch (error) {
    console.error('❌ [ACHIEVEMENTS] Error checking migration status:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check migration status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

