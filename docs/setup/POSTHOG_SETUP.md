# PostHog Analytics Setup Guide (Next.js 15.3+)

## ✅ Installation Complete

PostHog has been integrated using the **official Next.js 15.3+ lightweight integration** method with `instrumentation-client.ts`.

## 📁 Files Created/Updated

1. **`instrumentation-client.ts`** - PostHog initialization (Next.js 15.3+ method)
2. **`src/lib/posthog/client.ts`** - Client-side tracking utilities
3. **`src/lib/posthog/server.ts`** - Server-side tracking utilities
4. **`src/components/providers/posthog-provider.tsx`** - Simplified provider (kept for compatibility)
5. **`next.config.ts`** - Updated with `instrumentationHook: true`

## 🔧 Environment Variables

Add these to your `.env.local` file:

```bash
# PostHog Configuration
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_project_api_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com  # Optional, defaults to US instance
```

### How to Get Your PostHog Key:

1. Go to [PostHog](https://posthog.com) and sign up/login
2. Create a new project (or use existing)
3. Go to **Project Settings** → **Project API Key**
4. Copy the **Project API Key** and add it to `.env.local`

## 🚀 How It Works

### Automatic Tracking

PostHog automatically tracks:
- ✅ **Pageviews** - Every route change
- ✅ **Page leaves** - When users navigate away
- ✅ **Session recording** - User interactions (optional)

No code needed - it just works!

### Manual Event Tracking

Use the utilities in any client component:

```typescript
"use client"

import { analytics, identifyUser } from '@/lib/posthog/client'

export function MyComponent() {
  const handleButtonClick = () => {
    // Track custom event
    analytics.featureUsed('button_clicked', { buttonName: 'start_quiz' })
  }

  useEffect(() => {
    // Identify user when they log in
    if (userId) {
      identifyUser(userId, {
        username: user.username,
        email: user.email,
      })
    }
  }, [userId])

  return <button onClick={handleButtonClick}>Start Quiz</button>
}
```

### Direct PostHog Access

You can also use PostHog directly:

```typescript
"use client"

import { posthog } from '../../../instrumentation-client'

// Track event
posthog.capture('my event', { property: 'value' })

// Identify user
posthog.identify('user-123', { email: 'user@example.com' })
```

## 📊 Pre-built Analytics Events

The `analytics` object has pre-built events for common actions:

```typescript
import { analytics } from '@/lib/posthog/client'

// User authentication
analytics.login('email')
analytics.signup('email')
analytics.logout()

// Quiz events
analytics.quizStarted('singleplayer', 'Physics')
analytics.quizCompleted('singleplayer', 8, 10) // score, total
analytics.battleWon(opponentId)
analytics.battleLost(opponentId)

// Study notes
analytics.notesGenerated('Physics', 3) // topic, fileCount
analytics.notesViewed('Physics')

// Rooms
analytics.roomCreated(roomId)
analytics.roomJoined(roomId)

// Subscriptions
analytics.subscriptionStarted('pro')
analytics.subscriptionCancelled('pro')

// Custom feature usage
analytics.featureUsed('flashcard_flip', { cardIndex: 2 })
```

## 🖥️ Server-Side Tracking

Track events from API routes:

```typescript
import { trackServerEvent, identifyServerUser } from '@/lib/posthog/server'

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  
  // Track server-side event
  trackServerEvent(userId, 'api_quiz_generated', {
    topic: 'Physics',
    questionCount: 10,
  })

  // Identify user
  identifyServerUser(userId, {
    username: user.username,
    subscription: 'pro',
  })

  return NextResponse.json({ success: true })
}
```

## 🎯 Recommended Integration Points

### 1. User Authentication

**File:** `src/lib/actions/custom-auth.ts`

```typescript
import { trackServerEvent } from '@/lib/posthog/server'

// After successful login
trackServerEvent(result.user.id, 'user_logged_in', {
  method: 'email',
  timestamp: new Date().toISOString(),
})
```

### 2. Quiz Completion

**File:** `src/app/api/quiz-results/route.ts`

```typescript
import { trackServerEvent } from '@/lib/posthog/server'

// After saving quiz results
trackServerEvent(userId, 'quiz_completed', {
  score: correctAnswers,
  total: totalQuestions,
  xpEarned: xpEarned,
  topic: topic,
})
```

### 3. Study Notes Generation

**File:** `src/app/api/notes/route.ts`

```typescript
import { trackServerEvent } from '@/lib/posthog/server'

// After generating notes
trackServerEvent(userId, 'notes_generated', {
  topic: topic,
  difficulty: difficulty,
  fileCount: files.length,
})
```

## 🔒 Privacy & GDPR

PostHog is configured with:
- ✅ **Do Not Track (DNT) respect** - Honors browser DNT settings
- ✅ **No automatic PII capture** - Only tracks what you explicitly send
- ✅ **Session recording** - Can be disabled per user if needed

## 🧪 Testing

1. **Add Environment Variable:**
   ```bash
   NEXT_PUBLIC_POSTHOG_KEY=your_key_here
   ```

2. **Restart Dev Server:**
   ```bash
   npm run dev
   ```

3. **Check Console:**
   - You should see "✅ PostHog initialized" in browser console

4. **Verify in PostHog:**
   - Go to your PostHog dashboard
   - Navigate to **Events** or **Live Events**
   - You should see pageviews appearing automatically!

5. **Test Manual Event:**
   ```typescript
   // Add to any component
   import { analytics } from '@/lib/posthog/client'
   
   useEffect(() => {
     analytics.featureUsed('test_event', { test: true })
   }, [])
   ```

## 📈 What Gets Tracked Automatically

- ✅ **Pageviews** - Every route change (automatic)
- ✅ **Page leaves** - When users navigate away (automatic)
- ✅ **Session recording** - User interactions (enabled by default)

## 🐛 Troubleshooting

### Events not appearing?

1. ✅ Check environment variables are set correctly
2. ✅ Check browser console for PostHog errors
3. ✅ Verify PostHog key is correct in PostHog dashboard
4. ✅ Check network tab for PostHog API calls
5. ✅ Make sure `instrumentationHook: true` is in `next.config.ts`

### Want to disable PostHog?

Simply remove or comment out the PostHog initialization in `instrumentation-client.ts`:

```typescript
// Comment out the init call
// if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
//   posthog.init(...)
// }
```

## 📚 Resources

- [PostHog Docs](https://posthog.com/docs)
- [Next.js 15.3+ Integration](https://posthog.com/docs/integrate/nextjs)
- [Event Tracking Best Practices](https://posthog.com/docs/getting-started/send-events)

## 🎉 You're All Set!

PostHog is now integrated and will automatically track pageviews. Start adding custom events where needed!
