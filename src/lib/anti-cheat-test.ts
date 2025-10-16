// Test utility for anti-cheat functionality
// This file can be used to test the anti-cheat system during development

import { createClient } from '@/lib/supabase/client'

export interface TestCheatEvent {
  session_id: string
  user_id: string
  violation_type: 'tab_switch' | 'window_blur' | 'visibility_change'
  duration_ms: number
}

export async function testCheatEventDetection(event: TestCheatEvent) {
  try {
    const response = await fetch('/api/cheat-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event)
    })

    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Cheat event logged successfully:', result)
      return { success: true, data: result }
    } else {
      console.error('❌ Failed to log cheat event:', result)
      return { success: false, error: result }
    }
  } catch (error) {
    console.error('❌ Error testing cheat event:', error)
    return { success: false, error }
  }
}

export async function testRealtimeSubscription(sessionId: string) {
  const supabase = createClient()
  
  console.log(`🔍 Testing realtime subscription for session: ${sessionId}`)
  
  const channel = supabase.channel(`test-session:${sessionId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'session_events',
      filter: `session_id=eq.${sessionId}`
    }, (payload) => {
      console.log('📡 Realtime event received:', payload)
      if (payload.new.type === 'cheat_detected') {
        console.log('🚨 Cheat detected event:', payload.new.payload)
      }
    })
    .subscribe((status) => {
      console.log('📡 Subscription status:', status)
    })

  return channel
}

// Development helper to simulate cheat events
export function simulateCheatDetection() {
  console.log('🧪 Simulating cheat detection...')
  
  // This would be called in browser console during testing
  const mockEvent = {
    type: 'tab_switch' as const,
    duration: 3000,
    timestamp: Date.now()
  }
  
  console.log('Mock cheat event:', mockEvent)
  return mockEvent
}

// Usage in browser console:
// import { testCheatEventDetection, testRealtimeSubscription, simulateCheatDetection } from '@/lib/anti-cheat-test'
// simulateCheatDetection()
