# Clans System - UI Components Documentation

## Overview

This document describes the UI components implemented for the Clans/Classrooms system in Brain Battle.

## Component Structure

```
src/components/clans/
├── clans-section.tsx          # Main dashboard section
├── create-clan-modal.tsx      # Modal for creating clans
└── join-clan-modal.tsx        # Modal for joining clans

src/app/clans/
└── [id]/
    └── page.tsx               # Clan detail page
```

## Components

### 1. ClansSection

**Location**: `src/components/clans/clans-section.tsx`

**Purpose**: Main dashboard component that displays all user's clans and provides actions to create/join.

**Features**:
- Lists all clans the user belongs to
- Shows clan name, description, member count, and join code
- Displays role badges (Owner/Admin/Member)
- Copy-to-clipboard for join codes
- Empty state when no clans exist
- Create and Join buttons

**Props**: None (fetches data internally)

**State**:
- `clans`: Array of clan objects
- `loading`: Loading state
- `isCreateModalOpen`: Modal visibility
- `isJoinModalOpen`: Modal visibility
- `copiedCode`: Currently copied code (for visual feedback)

**API Calls**:
- `GET /api/clans/list` - Fetch user's clans

**Usage**:
```tsx
import { ClansSection } from "@/components/clans/clans-section"

<ClansSection />
```

### 2. CreateClanModal

**Location**: `src/components/clans/create-clan-modal.tsx`

**Purpose**: Modal dialog for creating a new clan (Pro users only).

**Features**:
- Form validation
- Pro account requirement check
- Error handling with upgrade prompts
- Auto-generates unique 8-character join code

**Props**:
```typescript
interface CreateClanModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (clan: Clan) => void
}
```

**Form Fields**:
- **Name** (required, 3-100 chars)
- **Description** (optional, max 500 chars)
- **Max Members** (1-100, default: 50)
- **Private Clan** (checkbox, default: true)

**API Calls**:
- `POST /api/clans/create` - Create new clan

**Usage**:
```tsx
<CreateClanModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSuccess={(clan) => {
    // Handle successful creation
    console.log('Clan created:', clan)
  }}
/>
```

**Error Handling**:
- Shows error message if Pro account required
- Provides link to upgrade page
- Validates form inputs
- Handles API errors gracefully

### 3. JoinClanModal

**Location**: `src/components/clans/join-clan-modal.tsx`

**Purpose**: Modal dialog for joining a clan by code.

**Features**:
- Auto-uppercase input
- 8-character validation
- Handles clan limits (Free: 3, Pro: 10)
- Error messages for common issues

**Props**:
```typescript
interface JoinClanModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (clan: Clan) => void
}
```

**Form Fields**:
- **Clan Code** (required, exactly 8 characters, alphanumeric)

**API Calls**:
- `POST /api/clans/join` - Join clan by code

**Usage**:
```tsx
<JoinClanModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSuccess={(clan) => {
    // Handle successful join
    console.log('Joined clan:', clan)
  }}
/>
```

**Error Handling**:
- Invalid code format
- Clan not found
- Already a member
- Clan is full
- User has reached clan limit (with upgrade prompt)

### 4. ClanDetailPage

**Location**: `src/app/clans/[id]/page.tsx`

**Purpose**: Full-page view of a single clan with details, members, and leaderboard.

**Features**:
- Clan header with info and join code
- Two tabs: Members and Leaderboard
- Role-based UI (owners can't leave)
- Copy join code functionality
- Leave clan functionality

**Route**: `/clans/[id]`

**Tabs**:

#### Members Tab
- Lists all clan members
- Shows role badges (Owner/Admin/Member)
- Displays member stats:
  - Level and XP
  - Accuracy percentage
  - Win/Loss record
- Sorted by role (owners/admins first)

#### Leaderboard Tab
- Ranked by XP (descending)
- Top 3 get special styling (🥇🥈🥉)
- Shows:
  - Rank number
  - Username
  - Level and XP
  - Accuracy
  - Win/Loss record

**API Calls**:
- `GET /api/clans/list` - Get clan info
- `GET /api/clans/members?clan_id=xxx` - Get members
- `GET /api/clans/stats?clan_id=xxx` - Get leaderboard
- `POST /api/clans/leave` - Leave clan

**State**:
- `clan`: Clan object
- `members`: Array of member objects
- `leaderboard`: Array of leaderboard entries
- `loading`: Loading state
- `activeTab`: 'members' | 'leaderboard'
- `copiedCode`: Copy feedback state
- `leaving`: Leave action state

## UI Patterns

### Role Badges

```tsx
// Owner
<Badge className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-300 border-orange-400/50">
  Owner
</Badge>

// Admin
<Badge className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-300 border-blue-400/50">
  Admin
</Badge>

// Member
<Badge className="bg-gradient-to-r from-slate-500/20 to-slate-600/20 text-slate-300 border-slate-400/50">
  Member
</Badge>
```

### Role Icons

```tsx
// Owner
<Crown className="h-4 w-4 text-orange-400" strokeWidth={3} />

// Admin
<Shield className="h-4 w-4 text-blue-400" strokeWidth={3} />

// Member
<User className="h-4 w-4 text-slate-400" strokeWidth={3} />
```

### Copy Code Button

```tsx
<button onClick={handleCopyCode}>
  {copiedCode === clan.code ? (
    <Check className="h-4 w-4 text-green-400" />
  ) : (
    <Copy className="h-4 w-4 text-slate-400" />
  )}
</button>
```

## Styling

All components follow Brain Battle's design system:
- Gradient backgrounds (`from-slate-800 to-slate-900`)
- Border styling (`border-4 border-slate-600/50`)
- Font weights (`font-black` for headings, `font-bold` for text)
- Color scheme (blue for primary, orange for Pro features)
- Consistent spacing and padding

## Integration Points

### Dashboard Integration

The `ClansSection` is integrated into the dashboard at:
- `src/app/dashboard/page.tsx`
- Positioned between `LobbySection` and `RecentBattles`

### Navigation

- Dashboard → Clans section (inline)
- Dashboard → Click clan card → `/clans/[id]`
- Clan detail page → Back to Dashboard

## Dependencies

### Required UI Components
- `Dialog` from `@/components/ui/dialog` (Radix UI)
- `Button` from `@/components/ui/button`
- `Input` from `@/components/ui/input`
- `Label` from `@/components/ui/label`
- `Textarea` from `@/components/ui/textarea`
- `Card` from `@/components/ui/card`
- `Badge` from `@/components/ui/badge`

### Required Libraries
- `@radix-ui/react-dialog` (already in package.json)
- `framer-motion` (for animations)
- `lucide-react` (for icons)

## Error States

### No Clans
- Shows empty state with icon
- Prompts user to create first clan
- Large "Create Your First Clan" button

### Clan Not Found
- Shows error card with message
- "Back to Dashboard" button
- Helpful error message

### Loading States
- Skeleton loaders for lists
- Spinner for page loads
- Disabled buttons during actions

## Accessibility

- Semantic HTML structure
- ARIA labels where needed
- Keyboard navigation support
- Focus management in modals
- Screen reader friendly error messages

## Future Enhancements

Potential additions:
- Clan settings page (for owners)
- Member management (promote/demote/remove)
- Clan announcements
- Session history
- Clan analytics
- Export clan data

---

**Last Updated**: December 2024  
**Status**: ✅ Production Ready


