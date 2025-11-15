# 🎯 Subscription System Documentation

Complete guide to the Brain Battle Pro subscription system, including implementation details, API usage, and feature gating.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Feature Limits](#feature-limits)
4. [API Routes](#api-routes)
5. [Client-Side Usage](#client-side-usage)
6. [UI Components](#ui-components)
7. [Room Size Limits](#room-size-limits)
8. [Adding New Limits](#adding-new-limits)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The subscription system enforces feature limits based on user subscription tiers:

- **Free Tier**: Limited features (5 documents/month, 10 questions/quiz, 4 players/room)
- **Pro Tier**: Unlimited access to all features (unlimited documents, unlimited questions, 20 players/room)

### Key Features

- ✅ Server-side limit enforcement (secure)
- ✅ Client-side subscription status checking
- ✅ Real-time limit checking via API
- ✅ Upgrade prompts when limits are hit
- ✅ Comprehensive onboarding flow
- ✅ Room size limits (Free: 4, Pro: 20)

---

## 🏗️ Architecture

### Core Components

```
src/
├── lib/
│   ├── subscription/
│   │   └── limits.ts              # Core limit checking logic
│   └── stripe/
│       ├── config.ts              # Stripe configuration
│       └── utils.ts               # Subscription utilities
├── app/
│   ├── api/
│   │   ├── subscription/
│   │   │   ├── status/route.ts    # Get subscription status
│   │   │   └── limits/route.ts    # Check specific limits
│   │   ├── rooms/
│   │   │   ├── create/route.ts    # Room creation (protected)
│   │   │   └── join/route.ts      # Room joining (protected)
│   │   ├── generate-quiz/route.ts # Quiz generation (protected)
│   │   └── embeddings/route.ts   # Document upload (protected)
│   └── pro-onboarding/
│       └── page.tsx               # Pro onboarding page
├── components/
│   └── subscription/
│       ├── upgrade-prompt.tsx     # Upgrade prompt component
│       ├── subscription-button.tsx # Subscribe button
│       └── customer-portal-button.tsx # Manage subscription
└── hooks/
    └── use-subscription.ts        # Client-side subscription hook
```

### Data Flow

1. **User Action** → Client checks subscription status via hook
2. **API Request** → Server validates limits using `limits.ts`
3. **Limit Exceeded** → Returns 403 with upgrade prompt data
4. **UI Update** → Shows upgrade prompt component

---

## 📊 Feature Limits

### Current Limits

| Feature | Free Tier | Pro Tier |
|---------|-----------|----------|
| **Documents/Month** | 5 | Unlimited |
| **Quiz Questions** | 10 per quiz | Unlimited |
| **Room Size** | 4 players | 20 players |
| **Export** | ❌ | ✅ |
| **Priority Processing** | ❌ | ✅ |
| **Advanced Analytics** | ❌ | ✅ |
| **Custom Themes** | ❌ | ✅ |
| **Advanced Study Notes** | ❌ | ✅ |

### Limit Definitions

Limits are defined in `src/lib/subscription/limits.ts`:

```typescript
export interface FeatureLimits {
  maxDocumentsPerMonth: number      // Infinity for Pro
  maxQuestionsPerQuiz: number       // Infinity for Pro
  maxPlayersPerRoom: number         // 4 for Free, 20 for Pro
  canExport: boolean
  hasPriorityProcessing: boolean
  hasAdvancedAnalytics: boolean
  hasCustomThemes: boolean
  hasAdvancedStudyNotes: boolean
}
```

---

## 🔌 API Routes

### 1. Get Subscription Status

**Endpoint:** `GET /api/subscription/status?userId=<userId>`

**Response:**
```json
{
  "success": true,
  "isPro": false,
  "subscription": {
    "tier": "free",
    "status": "free",
    "isActive": false,
    "currentPeriodEnd": null
  },
  "limits": {
    "maxDocumentsPerMonth": 5,
    "maxQuestionsPerQuiz": 10,
    "maxPlayersPerRoom": 4,
    "canExport": false,
    "hasPriorityProcessing": false,
    "hasAdvancedAnalytics": false,
    "hasCustomThemes": false,
    "hasAdvancedStudyNotes": false
  }
}
```

### 2. Check Specific Limits

**Endpoint:** `GET /api/subscription/limits?userId=<userId>&feature=<feature>&[params]`

**Supported Features:**
- `documents` - Check document upload limit
- `room-size` - Check room size limit (requires `requestedSize` param)
- `quiz-questions` - Check quiz question limit (requires `requestedQuestions` param)

**Example:**
```typescript
// Check document limit
GET /api/subscription/limits?userId=xxx&feature=documents

// Check room size limit
GET /api/subscription/limits?userId=xxx&feature=room-size&requestedSize=10

// Check quiz question limit
GET /api/subscription/limits?userId=xxx&feature=quiz-questions&requestedQuestions=15
```

**Response:**
```json
{
  "success": true,
  "allowed": false,
  "limit": 4,
  "requestedSize": 10,
  "requiresPro": true
}
```

### 3. Create Room (Protected)

**Endpoint:** `POST /api/rooms/create`

**Request:**
```json
{
  "userId": "xxx",
  "name": "Study Room",
  "maxPlayers": 4,
  "isPrivate": false,
  "timeLimit": 30,
  "totalQuestions": 10
}
```

**Response (Limit Exceeded):**
```json
{
  "success": false,
  "error": "Free users can create rooms with up to 4 players...",
  "requiresPro": true,
  "maxAllowed": 4,
  "requestedSize": 10
}
```

### 4. Join Room (Protected)

**Endpoint:** `POST /api/rooms/join`

**Request:**
```json
{
  "userId": "xxx",
  "roomCode": "ABC123"
}
```

**Response (Limit Exceeded):**
```json
{
  "success": false,
  "error": "This room supports up to 20 players, but free users...",
  "requiresPro": true,
  "roomMaxPlayers": 20,
  "userMaxPlayers": 4
}
```

---

## 💻 Client-Side Usage

### Using the `useSubscription` Hook

```typescript
import { useSubscription } from '@/hooks/use-subscription'

function MyComponent() {
  const userId = getCurrentUserId()
  const { isPro, limits, loading, subscription } = useSubscription(userId)

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      {isPro ? (
        <p>You have Pro access!</p>
      ) : (
        <p>Free tier: {limits?.maxPlayersPerRoom} players max</p>
      )}
    </div>
  )
}
```

### Checking Limits Before Actions

```typescript
// Check room size limit before creating room
const checkRoomSize = async (requestedSize: number) => {
  const response = await fetch(
    `/api/subscription/limits?userId=${userId}&feature=room-size&requestedSize=${requestedSize}`
  )
  const data = await response.json()
  
  if (!data.allowed) {
    // Show upgrade prompt
    setShowUpgradePrompt(true)
  } else {
    // Proceed with room creation
    createRoom(requestedSize)
  }
}
```

---

## 🎨 UI Components

### UpgradePrompt Component

Displays upgrade prompts when limits are hit.

**Usage:**
```typescript
import { UpgradePrompt } from '@/components/subscription/upgrade-prompt'

<UpgradePrompt 
  feature="room size"
  limit={4}
  current={4}
  variant="default" // or "compact" or "banner"
/>
```

**Variants:**
- `default` - Full-featured prompt with comparison table
- `compact` - Minimal inline prompt
- `banner` - Top banner style

### SubscriptionButton Component

Button to initiate Stripe checkout.

**Usage:**
```typescript
import { SubscriptionButton } from '@/components/subscription/subscription-button'

<SubscriptionButton priceId={PRO_MONTHLY_PRICE_ID}>
  Upgrade to Pro
</SubscriptionButton>
```

---

## 🚪 Room Size Limits

### Implementation

Room size limits are enforced at two points:

1. **Room Creation** - Users cannot create rooms exceeding their tier limit
2. **Room Joining** - Free users cannot join rooms with > 4 players

### Free Tier Behavior

- Can create rooms with 2-4 players
- Can join rooms with up to 4 players
- Cannot create/join rooms with > 4 players

### Pro Tier Behavior

- Can create rooms with 2-20 players
- Can join rooms with up to 20 players
- Full access to all room sizes

### Code Example

```typescript
// In create-room page
const { isPro, limits } = useSubscription(userId)
const maxPlayers = limits?.maxPlayersPerRoom || 4

<input
  type="number"
  min="2"
  max={maxPlayers}
  value={maxPlayers}
  onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
/>
```

---

## ➕ Adding New Limits

### Step 1: Update FeatureLimits Interface

```typescript
// src/lib/subscription/limits.ts
export interface FeatureLimits {
  // ... existing limits
  maxNewFeature: number  // Add new limit
}
```

### Step 2: Update getUserLimits Function

```typescript
export async function getUserLimits(userId: string): Promise<FeatureLimits> {
  const isPro = await hasProSubscription(userId)
  
  if (isPro) {
    return {
      // ... existing limits
      maxNewFeature: Infinity,  // Pro: unlimited
    }
  }
  
  return {
    // ... existing limits
    maxNewFeature: 5,  // Free: 5
  }
}
```

### Step 3: Create Limit Check Function

```typescript
export async function checkNewFeatureLimit(
  userId: string,
  requestedAmount: number
): Promise<{ allowed: boolean; limit: number; requiresPro: boolean }> {
  const limits = await getUserLimits(userId)
  const maxAllowed = limits.maxNewFeature
  
  return {
    allowed: requestedAmount <= maxAllowed,
    limit: maxAllowed,
    requiresPro: requestedAmount > 5 && limits.maxNewFeature === 5
  }
}
```

### Step 4: Protect API Route

```typescript
// src/app/api/new-feature/route.ts
import { checkNewFeatureLimit } from '@/lib/subscription/limits'

export async function POST(request: NextRequest) {
  const { userId, amount } = await request.json()
  
  const limitCheck = await checkNewFeatureLimit(userId, amount)
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { 
        error: `Free users limited to ${limitCheck.limit}. Upgrade to Pro.`,
        requiresPro: limitCheck.requiresPro
      },
      { status: 403 }
    )
  }
  
  // Proceed with feature
}
```

### Step 5: Update UI

```typescript
// In component
const { limits } = useSubscription(userId)

{!limits?.canUseNewFeature && (
  <UpgradePrompt feature="new feature" />
)}
```

---

## 🧪 Testing

### Test Subscription Status

```typescript
// Test free user limits
const freeLimits = await getUserLimits('free-user-id')
expect(freeLimits.maxPlayersPerRoom).toBe(4)

// Test pro user limits
const proLimits = await getUserLimits('pro-user-id')
expect(proLimits.maxPlayersPerRoom).toBe(20)
```

### Test Room Creation

```typescript
// Test free user creating room with 4 players (should succeed)
const response1 = await fetch('/api/rooms/create', {
  method: 'POST',
  body: JSON.stringify({
    userId: 'free-user-id',
    maxPlayers: 4
  })
})
expect(response1.ok).toBe(true)

// Test free user creating room with 10 players (should fail)
const response2 = await fetch('/api/rooms/create', {
  method: 'POST',
  body: JSON.stringify({
    userId: 'free-user-id',
    maxPlayers: 10
  })
})
expect(response2.status).toBe(403)
```

---

## 🔧 Troubleshooting

### Issue: Limits Not Enforcing

**Solution:**
1. Check that `hasProSubscription()` is working correctly
2. Verify Stripe webhook is updating subscription status
3. Check database `users.subscription_status` field

### Issue: Upgrade Prompt Not Showing

**Solution:**
1. Verify `requiresPro` flag is set in API response
2. Check that `UpgradePrompt` component is imported correctly
3. Ensure error handling in component catches `requiresPro` flag

### Issue: Room Size Not Updating

**Solution:**
1. Check `useSubscription` hook is loading limits correctly
2. Verify `maxPlayers` state updates when limits change
3. Check API route is returning correct `maxAllowed` value

### Issue: Subscription Status Not Updating

**Solution:**
1. Verify Stripe webhook endpoint is working
2. Check `updateSubscriptionFromStripe()` function
3. Verify database trigger is updating `users` table

---

## 📝 Best Practices

1. **Always Check Limits Server-Side**
   - Client-side checks are for UX only
   - Server-side checks enforce security

2. **Show Clear Error Messages**
   - Include limit information
   - Provide upgrade path

3. **Use Upgrade Prompts Strategically**
   - Show when limits are hit
   - Don't spam users

4. **Cache Subscription Status**
   - Use `useSubscription` hook for client-side caching
   - Refresh when needed (after upgrade)

5. **Test Both Tiers**
   - Test free tier limits
   - Test pro tier unlimited access

---

## 🔗 Related Documentation

- [Stripe Setup Guide](./STRIPE_SETUP_GUIDE.md)
- [Pro Plan Features](./PRO_PLAN_FEATURES.md)
- [API Documentation](./API_DOCUMENTATION.md)

---

## 📞 Support

For issues or questions about the subscription system:
1. Check this documentation
2. Review error logs
3. Check Stripe dashboard for subscription status
4. Verify database subscription fields

---

**Last Updated:** 2024-12-19
**Version:** 1.0.0

