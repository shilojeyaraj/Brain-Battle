# Next Steps After Sentry Installation

## ✅ What's Done
- ✅ Sentry installed and configured
- ✅ Error boundaries set up
- ✅ Sentry config files created
- ✅ Error tracking utilities ready

## 🎯 Immediate Next Steps

### 1. Test Sentry (Do This First!)

Create a test endpoint to verify Sentry is working:

```typescript
// src/app/api/test-sentry/route.ts
import { NextResponse } from 'next/server'
import { captureException } from '@/lib/monitoring/sentry'

export async function GET() {
  try {
    // Intentionally throw an error
    throw new Error('Test error for Sentry')
  } catch (error) {
    captureException(error as Error, { test: true })
    return NextResponse.json({ 
      message: 'Error sent to Sentry - check your dashboard!',
      error: error instanceof Error ? error.message : 'Unknown'
    })
  }
}
```

Then visit: `http://localhost:3000/api/test-sentry`
Check your Sentry dashboard - you should see the error appear!

### 2. Add Sentry to Your API Routes

Update your API routes to use Sentry. Here's an example:

**Before:**
```typescript
export async function POST(request: NextRequest) {
  try {
    // your code
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

**After:**
```typescript
import { captureException } from '@/lib/monitoring/sentry'

export async function POST(request: NextRequest) {
  try {
    // your code
  } catch (error) {
    captureException(error instanceof Error ? error : new Error(String(error)), {
      route: '/api/your-route',
      method: 'POST'
    })
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}
```

### 3. Priority Routes to Update

Add Sentry to these critical routes first:

1. **`/api/generate-quiz/route.ts`** - Quiz generation (OpenAI calls)
2. **`/api/notes/route.ts`** - Notes generation (PDF parsing)
3. **`/api/multiplayer-results/route.ts`** - Game results processing
4. **`/api/cheat-events/route.ts`** - Anti-cheat tracking
5. **`/api/user-stats/route.ts`** - User statistics

### 4. Set User Context

When users log in, set their context in Sentry:

```typescript
// In your login/signup flow
import { setUser } from '@/lib/monitoring/sentry'

// After successful login
setUser({
  id: user.id,
  email: user.email,
  username: user.username
})

// On logout
import { clearUser } from '@/lib/monitoring/sentry'
clearUser()
```

### 5. Set Up Sentry Alerts

1. Go to your Sentry dashboard
2. Navigate to **Alerts** → **Create Alert Rule**
3. Set up alerts for:
   - **Critical errors** (> 5 errors in 5 minutes)
   - **New issues** (new error types)
   - **Performance issues** (slow API responses)

### 6. Configure Notifications

In Sentry dashboard:
1. Go to **Settings** → **Notifications**
2. Add email/Slack notifications for:
   - Critical errors
   - New issues
   - Spike in error rate

## 📋 Production Checklist Items Completed

- ✅ Error tracking configured (Sentry)
- ✅ Error boundaries implemented
- ✅ Health check endpoint created

## 🔄 Still To Do (From Production Planning)

### High Priority
- [ ] Add input validation to all API routes (use `validateRequestBody` from `api-error-handler.ts`)
- [ ] Add performance monitoring to critical routes
- [ ] Test error boundaries work correctly
- [ ] Set up Sentry alerts and notifications

### Medium Priority
- [ ] Add cost tracking for OpenAI API calls
- [ ] Add structured logging to replace console.log
- [ ] Set user context in Sentry on login
- [ ] Configure Sentry release tracking

### Low Priority
- [ ] Customize Sentry error grouping
- [ ] Set up Sentry integrations (Slack, etc.)
- [ ] Configure source maps for better stack traces

## 🧪 Testing Checklist

- [ ] Test error appears in Sentry dashboard
- [ ] Test error boundary shows fallback UI
- [ ] Test API errors are captured
- [ ] Test user context is set correctly
- [ ] Test alerts trigger correctly

## 📚 Quick Reference

### Capture an Error
```typescript
import { captureException } from '@/lib/monitoring/sentry'

captureException(error, { context: 'my-feature' })
```

### Set User Context
```typescript
import { setUser } from '@/lib/monitoring/sentry'

setUser({ id: userId, email: userEmail })
```

### Log a Message
```typescript
import { captureMessage } from '@/lib/monitoring/sentry'

captureMessage('Something important happened', 'info', { data: 'value' })
```

## 🎯 Recommended Order

1. **Test Sentry** (create test endpoint)
2. **Add to 2-3 critical routes** (generate-quiz, notes)
3. **Set user context** (in login flow)
4. **Set up alerts** (in Sentry dashboard)
5. **Add to remaining routes** (gradually)

---

**Need Help?**
- Check `SENTRY_SETUP.md` for detailed setup
- Check `PRODUCTION_IMPLEMENTATION_GUIDE.md` for full implementation guide
- Sentry Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/

