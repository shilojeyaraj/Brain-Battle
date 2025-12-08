import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getUserIdFromRequest } from '@/lib/auth/session-cookies'

/**
 * API route to set user's subscription to free plan
 * Used when new users choose to continue with the free plan
 */
export async function POST(request: NextRequest) {
  try {
    // Get userId from secure session cookie
    const userId = await getUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      )
    }

    const adminClient = createAdminClient()

    // Update user's subscription status to free
    const { error: userError } = await adminClient
      .from('users')
      .update({
        subscription_status: 'free',
        subscription_tier: 'free',
        subscription_current_period_end: null,
        subscription_cancel_at_period_end: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (userError) {
      console.error('❌ [SET FREE] Error updating subscription:', userError)
      return NextResponse.json(
        { error: 'Failed to set free plan' },
        { status: 500 }
      )
    }

    // Ensure player_stats exists and trial is initialized
    const { data: existingStats } = await adminClient
      .from('player_stats')
      .select('trial_quiz_diagrams_remaining, quiz_diagrams_this_month, has_used_trial_quiz_diagrams')
      .eq('user_id', userId)
      .single()

    if (!existingStats) {
      // Create player_stats if it doesn't exist
      const { error: statsError } = await adminClient
        .from('player_stats')
        .insert({
          user_id: userId,
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
          // Initialize free trial: 3 trial quiz diagrams
          trial_quiz_diagrams_remaining: 3,
          quiz_diagrams_this_month: 0,
          has_used_trial_quiz_diagrams: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (statsError) {
        console.error('❌ [SET FREE] Error creating player stats:', statsError)
        // Don't fail - stats might exist from another source
      } else {
        console.log('✅ [SET FREE] Player stats created with trial initialized')
      }
    } else {
      // Ensure trial is initialized if stats exist but trial fields are null
      const trialRemaining = existingStats.trial_quiz_diagrams_remaining
      const monthlyCount = existingStats.quiz_diagrams_this_month ?? 0
      
      if (trialRemaining === null || 
          trialRemaining === undefined ||
          existingStats.has_used_trial_quiz_diagrams === null ||
          existingStats.has_used_trial_quiz_diagrams === undefined) {
        const { error: updateError } = await adminClient
          .from('player_stats')
          .update({
            trial_quiz_diagrams_remaining: 3,
            quiz_diagrams_this_month: monthlyCount,
            has_used_trial_quiz_diagrams: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (updateError) {
          console.error('❌ [SET FREE] Error initializing trial:', updateError)
        } else {
          console.log('✅ [SET FREE] Trial initialized for existing stats')
        }
      }
    }

    console.log('✅ [SET FREE] User subscription set to free:', userId)
    
    return NextResponse.json({ 
      success: true,
      message: 'Free plan activated successfully'
    })
  } catch (error) {
    console.error('❌ [SET FREE] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

