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

    // Parse request body
    const body = await request.json()
    const { session_id, violation_type, duration_ms } = body

    // Validate required fields
    if (!session_id || !violation_type || duration_ms === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: session_id, violation_type, duration_ms' },
        { status: 400 }
      )
    }

    // Get user's display name from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      )
    }

    // Verify user is a member of the room that owns this session
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select(`
        id,
        room_id,
        rooms!inner(id, room_members!inner(user_id))
      `)
      .eq('id', session_id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Quiz session not found' },
        { status: 404 }
      )
    }

    // Check if user is a member of the room
    const isMember = session.rooms.room_members.some(
      (member: { user_id: string }) => member.user_id === user.id
    )

    if (!isMember) {
      return NextResponse.json(
        { error: 'Not authorized to report events for this session' },
        { status: 403 }
      )
    }

    // Create cheat event payload
    const payload = {
      user_id: user.id,
      display_name: profile.display_name,
      violation_type,
      duration_seconds: Math.round(duration_ms / 1000),
      timestamp: new Date().toISOString()
    }

    // Insert the cheat event
    const { data: event, error: insertError } = await supabase
      .from('session_events')
      .insert({
        session_id,
        type: 'cheat_detected',
        payload
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting cheat event:', insertError)
      return NextResponse.json(
        { error: 'Failed to log cheat event' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      event_id: event.id,
      payload
    })

  } catch (error) {
    console.error('Error in cheat events API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
