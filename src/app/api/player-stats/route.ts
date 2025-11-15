import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'

/**
 * API route to create/update player stats
 * Uses admin client to bypass RLS since custom auth doesn't set auth.uid()
 */
export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient()
    const body = await request.json()
    const { user_id, stats } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // First, verify the user exists in the users table
    const { data: userExists } = await adminClient
      .from('users')
      .select('id')
      .eq('id', user_id)
      .single()

    if (!userExists) {
      console.error('❌ [STATS API] User does not exist in users table:', user_id)
      return NextResponse.json(
        { error: 'User does not exist. Please register first.' },
        { status: 404 }
      )
    }

    // Check if stats exist
    const { data: existingStats } = await adminClient
      .from('player_stats')
      .select('user_id')
      .eq('user_id', user_id)
      .single()

    if (existingStats) {
      // Update existing stats
      const { data, error } = await adminClient
        .from('player_stats')
        .update({
          ...stats,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user_id)
        .select()
        .single()

      if (error) {
        console.error('❌ [STATS API] Error updating stats:', error)
        return NextResponse.json(
          { error: 'Failed to update stats' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, data })
    } else {
      // Create new stats with defaults
      const defaultStats = {
        user_id,
        level: 1,
        xp: 0,
        total_wins: 0,
        total_losses: 0,
        total_games: 0,
        win_streak: 0,
        best_streak: 0,
        total_questions_answered: 0,
        correct_answers: 0,
        accuracy: 0.00,
        average_response_time: 0.00,
        favorite_subject: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...stats
      }

      const { data, error } = await adminClient
        .from('player_stats')
        .insert(defaultStats)
        .select()
        .single()

      if (error) {
        console.error('❌ [STATS API] Error creating stats:', error)
        return NextResponse.json(
          { error: 'Failed to create stats' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, data })
    }
  } catch (error) {
    console.error('❌ [STATS API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

