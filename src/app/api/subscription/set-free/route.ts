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
    const { error } = await adminClient
      .from('users')
      .update({
        subscription_status: 'free',
        subscription_tier: 'free',
        subscription_current_period_end: null,
        subscription_cancel_at_period_end: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) {
      console.error('❌ [SET FREE] Error updating subscription:', error)
      return NextResponse.json(
        { error: 'Failed to set free plan' },
        { status: 500 }
      )
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

