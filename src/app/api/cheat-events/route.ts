import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { room_id, user_id, violation_type, duration_seconds, timestamp } = body

    // Validate required fields
    if (!room_id || !user_id || !violation_type || !duration_seconds || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: room_id, user_id, violation_type, duration_seconds, timestamp' },
        { status: 400 }
      )
    }

    console.log('🚨 [CHEAT EVENTS] Recording cheat violation:', {
      room_id,
      user_id,
      violation_type,
      duration_seconds,
      timestamp
    })

    // Find the active quiz session for this room
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select('id')
      .eq('room_id', room_id)
      .eq('status', 'active')
      .single()

    if (sessionError || !session) {
      console.error('❌ [CHEAT EVENTS] No active quiz session found:', sessionError)
      return NextResponse.json(
        { error: 'No active quiz session found' },
        { status: 404 }
      )
    }

    // Get user profile for display name
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user_id)
      .single()

    // Insert cheat event into session_events table
    const { error: eventError } = await supabase
      .from('session_events')
      .insert({
        session_id: session.id,
        type: 'cheat_detected',
        payload: {
          user_id: user_id,
          display_name: profile?.display_name || 'Unknown Player',
          violation_type: violation_type,
          duration_seconds: duration_seconds,
          timestamp: timestamp
        }
      })

    if (eventError) {
      console.error('❌ [CHEAT EVENTS] Error inserting cheat event:', eventError)
      return NextResponse.json(
        { error: 'Failed to record cheat event' },
        { status: 500 }
      )
    }

    console.log('✅ [CHEAT EVENTS] Cheat event recorded successfully')

    return NextResponse.json({
      success: true,
      message: 'Cheat event recorded'
    })

  } catch (error) {
    console.error('❌ [CHEAT EVENTS] Error in cheat events API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}