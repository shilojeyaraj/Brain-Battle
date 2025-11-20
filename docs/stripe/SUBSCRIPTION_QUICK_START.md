# 🚀 Subscription System Quick Start

Quick reference guide for using the subscription system in Brain Battle.

## ✅ What's Implemented

### Core Features
- ✅ Room size limits (Free: 4 players, Pro: 20 players)
- ✅ Document upload limits (Free: 5/month, Pro: Unlimited)
- ✅ Quiz question limits (Free: 10/quiz, Pro: Unlimited)
- ✅ API protection for all limited features
- ✅ Upgrade prompts when limits are hit
- ✅ Pro onboarding page

### Files Created

**Core Logic:**
- `src/lib/subscription/limits.ts` - Limit checking utilities
- `src/hooks/use-subscription.ts` - Client-side subscription hook

**API Routes:**
- `src/app/api/subscription/status/route.ts` - Get subscription status
- `src/app/api/subscription/limits/route.ts` - Check specific limits
- `src/app/api/rooms/create/route.ts` - Protected room creation
- `src/app/api/rooms/join/route.ts` - Protected room joining

**UI Components:**
- `src/components/subscription/upgrade-prompt.tsx` - Upgrade prompts
- `src/app/pro-onboarding/page.tsx` - Pro onboarding page

**Documentation:**
- `SUBSCRIPTION_SYSTEM_DOCUMENTATION.md` - Full documentation
- `SUBSCRIPTION_QUICK_START.md` - This file

## 🎯 Usage Examples

### Check Subscription Status

```typescript
import { useSubscription } from '@/hooks/use-subscription'

const { isPro, limits, loading } = useSubscription(userId)

if (isPro) {
  // User has Pro subscription
  console.log('Max players:', limits.maxPlayersPerRoom) // 20
} else {
  // Free user
  console.log('Max players:', limits.maxPlayersPerRoom) // 4
}
```

### Show Upgrade Prompt

```typescript
import { UpgradePrompt } from '@/components/subscription/upgrade-prompt'

{!isPro && maxPlayers > 4 && (
  <UpgradePrompt 
    feature="room size"
    limit={4}
    current={maxPlayers}
    variant="compact"
  />
)}
```

### Check Limits Before Action

```typescript
// Check room size limit
const response = await fetch(
  `/api/subscription/limits?userId=${userId}&feature=room-size&requestedSize=10`
)
const data = await response.json()

if (!data.allowed) {
  // Show upgrade prompt
  setShowUpgradePrompt(true)
} else {
  // Proceed with action
  createRoom(10)
}
```

## 🔒 Protected Features

All these features are now protected with subscription checks:

1. **Room Creation** - Max players enforced
2. **Room Joining** - Free users can't join > 4 player rooms
3. **Document Uploads** - Monthly limit enforced
4. **Quiz Generation** - Question limit enforced

## 📊 Current Limits

| Feature | Free | Pro |
|---------|------|-----|
| Room Size | 4 players | 20 players |
| Documents/Month | 5 | Unlimited |
| Quiz Questions | 10 | Unlimited |

## 🎨 UI Integration

### Room Creation Page
- Shows max players based on subscription
- Displays upgrade prompt if limit exceeded
- Pro badge for Pro users

### Room Join Page
- Automatically checks room size limits
- Shows error if room exceeds free tier limit

### Pro Onboarding
- Accessible at `/pro-onboarding`
- Shows all Pro features
- Direct links to pricing page

## 🔧 Next Steps

1. **Set up Stripe** (when ready)
   - Create products in Stripe Dashboard
   - Set `STRIPE_PRO_MONTHLY_PRICE_ID` and `STRIPE_PRO_YEARLY_PRICE_ID`
   - Configure webhook endpoint

2. **Test the System**
   - Create free account
   - Try creating room with 10 players (should fail)
   - Try uploading 6 documents (should fail after 5)
   - Try generating quiz with 15 questions (should fail)

3. **Customize Limits** (if needed)
   - Edit `src/lib/subscription/limits.ts`
   - Update `getUserLimits()` function

## 📚 Full Documentation

See `SUBSCRIPTION_SYSTEM_DOCUMENTATION.md` for complete details.

## 🐛 Troubleshooting

**Limits not working?**
- Check subscription status in database
- Verify `hasProSubscription()` function
- Check API route error responses

**Upgrade prompt not showing?**
- Verify `requiresPro` flag in API response
- Check component import path
- Ensure error handling catches flag

**Room size not updating?**
- Check `useSubscription` hook loading state
- Verify limits are loaded before setting maxPlayers
- Check API response format

---

**Ready to use!** The subscription system is fully implemented and ready for Stripe integration.

