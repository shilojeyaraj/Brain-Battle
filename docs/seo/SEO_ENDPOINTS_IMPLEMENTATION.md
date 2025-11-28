# SEO Endpoints Implementation Guide

**Last Updated: January 2025**

## Overview

This document describes the implementation of SEO-friendly public endpoints that improve discoverability and user experience through proper authentication redirects.

## Implemented Endpoints

### 1. `/join-lobby`
- **Purpose**: Join a multiplayer study room with a room code
- **SEO Benefits**: Indexable URL, shareable links (`/join-lobby?code=ABC123`)
- **Auth Flow**: Redirects to `/login?redirect=/join-lobby` if not authenticated
- **After Auth**: Redirects back to `/join-lobby` (or `/room/{code}` if code provided)

### 2. `/create-quiz`
- **Purpose**: Create quizzes from PDF documents
- **SEO Benefits**: Better discoverability for "create quiz" searches
- **Auth Flow**: Redirects to `/login?redirect=/create-quiz` if not authenticated
- **After Auth**: Redirects to `/singleplayer` page

### 3. `/singleplayer-setup`
- **Purpose**: Set up singleplayer quiz sessions
- **SEO Benefits**: Better discoverability for "singleplayer quiz" searches
- **Auth Flow**: Redirects to `/login?redirect=/singleplayer-setup` if not authenticated
- **After Auth**: Redirects to `/singleplayer` page

### 4. `/create-room`
- **Purpose**: Create multiplayer study rooms
- **SEO Benefits**: Better discoverability for "create study room" searches
- **Auth Flow**: Uses `useRequireAuth` hook, redirects to login if not authenticated
- **After Auth**: Stays on page, allows room creation

### 5. `/study-notes`
- **Purpose**: Generate AI-powered study notes from PDFs
- **SEO Benefits**: Better discoverability for "study notes generator" searches
- **Auth Flow**: Redirects to `/login?redirect=/study-notes` if not authenticated
- **After Auth**: Redirects to `/singleplayer` page

## Technical Implementation

### Authentication Hook

**File**: `src/hooks/use-require-auth.ts`

A reusable React hook that:
- Checks authentication status via `/api/user/current`
- Automatically redirects to login with current URL as redirect parameter
- Returns `{ userId, loading }` for conditional rendering

```typescript
const { userId, loading } = useRequireAuth()

if (loading) return <Loading />
if (!userId) return null // Redirecting to login

// User is authenticated, render protected content
```

### Login Redirect Handling

**File**: `src/app/login/page.tsx`

Updated to:
1. Read `redirect` parameter from URL query string
2. After successful login, redirect to original destination
3. Fallback to `/dashboard` if no redirect parameter

```typescript
const redirectParam = searchParams.get('redirect')
const redirectUrl = redirectParam 
  ? decodeURIComponent(redirectParam)
  : '/dashboard'
router.push(redirectUrl)
```

### Signup Redirect Handling

**File**: `src/app/signup/page.tsx`

- Stores redirect parameter in localStorage during signup
- After pricing selection, redirects to original destination
- Falls back to dashboard if no redirect stored

## User Flow Examples

### Example 1: Join Lobby Flow

```
1. User visits: /join-lobby?code=ABC123
2. Not authenticated → Redirects to: /login?redirect=/join-lobby%3Fcode%3DABC123
3. User logs in
4. Redirects to: /join-lobby?code=ABC123
5. Page detects code → Redirects to: /room/ABC123
```

### Example 2: Create Quiz Flow

```
1. User visits: /create-quiz
2. Not authenticated → Redirects to: /login?redirect=/create-quiz
3. User logs in
4. Redirects to: /create-quiz
5. User clicks "Start Creating Quiz" → Goes to: /singleplayer
```

### Example 3: Signup Flow

```
1. User visits: /create-quiz
2. Not authenticated → Redirects to: /login?redirect=/create-quiz
3. User clicks "Sign up" → Goes to: /signup?redirect=/create-quiz
4. User signs up → Goes to: /pricing?newUser=true
5. User selects plan → Goes to: /dashboard
6. (Future: Could redirect to /create-quiz after onboarding)
```

## SEO Benefits

### 1. Indexable URLs
- Each endpoint is a public, indexable page
- Search engines can discover and index these pages
- Better ranking for action-based searches

### 2. Shareable Links
- Users can share direct links to specific actions
- Example: `/join-lobby?code=ABC123` can be shared in group chats
- Links work even for non-authenticated users (redirects to login)

### 3. Better User Experience
- Users land on the exact page they intended
- No need to navigate after login
- Seamless authentication flow

### 4. Analytics Tracking
- Track which entry points users use most
- Measure conversion rates for different actions
- Identify popular features

## Metadata & SEO

Each endpoint includes proper metadata:

```typescript
export const metadata: Metadata = {
  title: "Join Study Lobby - Brain Battle",
  description: "Join a multiplayer study battle room...",
  keywords: ["join study room", "multiplayer quiz", ...],
}
```

## Future Enhancements

1. **Post-Signup Redirect**: After pricing selection, redirect to original destination
2. **Query Parameter Preservation**: Preserve all query parameters through auth flow
3. **Deep Linking**: Support deep links to specific quiz sessions or rooms
4. **Social Sharing**: Add Open Graph tags for better social sharing
5. **Analytics Events**: Track when users hit these endpoints

## Testing Checklist

- [ ] Visit `/join-lobby` while logged out → Should redirect to login
- [ ] Login from redirect → Should return to `/join-lobby`
- [ ] Visit `/create-quiz` while logged out → Should redirect to login
- [ ] Login from redirect → Should return to `/create-quiz`
- [ ] Share `/join-lobby?code=ABC123` → Should work for new users
- [ ] All endpoints load with proper metadata
- [ ] All endpoints work on mobile devices

## Files Modified

1. `src/hooks/use-require-auth.ts` - New authentication hook
2. `src/app/join-lobby/page.tsx` - New endpoint
3. `src/app/create-quiz/page.tsx` - New endpoint
4. `src/app/singleplayer-setup/page.tsx` - New endpoint
5. `src/app/create-room/page.tsx` - Updated to use auth hook
6. `src/app/study-notes/page.tsx` - New endpoint
7. `src/app/login/page.tsx` - Updated to handle redirect parameter
8. `src/app/signup/page.tsx` - Updated to store redirect parameter

## Related Documentation

- [Complete SEO Strategy](./COMPLETE_SEO_STRATEGY.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [Easy SEO Wins](./EASY_SEO_WINS.md)

