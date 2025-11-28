# Clans/Classrooms System - Implementation Guide

## Architecture Overview

The clan system implements a **freemium model** where:
- **Pro users** (teachers/organizers) can **CREATE** clans
- **Free users** (students/participants) can **JOIN** clans
- This enables one Pro account to support unlimited free participation

## Database Schema

### Tables

#### `clans`
Stores clan/classroom information.

```sql
CREATE TABLE public.clans (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    code VARCHAR(8) UNIQUE NOT NULL,  -- 8-character join code
    owner_id UUID NOT NULL,          -- Pro user who created it
    is_private BOOLEAN DEFAULT true,
    max_members INTEGER DEFAULT 50,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

**Key Points:**
- `owner_id` references `users.id` (must be Pro user)
- `code` is unique 8-character alphanumeric (e.g., "ABC123XY")
- `max_members` defaults to 50 (allows up to 500 participants per Pro account)

#### `clan_members`
Many-to-many relationship between users and clans.

```sql
CREATE TABLE public.clan_members (
    id UUID PRIMARY KEY,
    clan_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(20) DEFAULT 'member',  -- 'owner', 'admin', or 'member'
    joined_at TIMESTAMPTZ,
    UNIQUE(clan_id, user_id)
);
```

**Key Points:**
- Both Pro and Free users can be members
- Roles: `owner` (creator, Pro), `admin` (can be promoted), `member` (default)
- Prevents duplicate memberships

#### `clan_sessions`
Links quiz sessions to clans for clan-wide battles.

```sql
CREATE TABLE public.clan_sessions (
    id UUID PRIMARY KEY,
    clan_id UUID NOT NULL,
    session_id UUID NOT NULL,  -- References quiz_sessions
    created_by UUID NOT NULL,  -- Must be owner/admin
    created_at TIMESTAMPTZ,
    UNIQUE(session_id)
);
```

**Key Points:**
- Links quiz sessions to clans
- Only owners/admins can create sessions
- All members can participate in sessions

## UI Components

### Component Structure

```
src/components/clans/
├── clans-section.tsx          # Main dashboard section
├── create-clan-modal.tsx      # Modal for creating clans
└── join-clan-modal.tsx        # Modal for joining clans

src/app/clans/
└── [id]/
    └── page.tsx               # Clan detail page
```

### Key Components

1. **ClansSection** (`src/components/clans/clans-section.tsx`)
   - Displays all user's clans in dashboard
   - Shows member count, join codes, roles
   - Create and Join action buttons
   - Copy-to-clipboard functionality

2. **CreateClanModal** (`src/components/clans/create-clan-modal.tsx`)
   - Pro-only creation form
   - Validates input (name, description, max members)
   - Error handling with upgrade prompts
   - Auto-generates unique join code

3. **JoinClanModal** (`src/components/clans/join-clan-modal.tsx`)
   - Join by 8-character code
   - Auto-uppercase and validation
   - Handles clan limits (Free: 3, Pro: 10)
   - Error messages for common issues

4. **ClanDetailPage** (`src/app/clans/[id]/page.tsx`)
   - Full clan view with header
   - Members tab (with roles and stats)
   - Leaderboard tab (ranked by XP)
   - Leave clan functionality
   - Copy join code

### Integration

The clans section is integrated into the dashboard:
- Location: `src/app/dashboard/page.tsx`
- Positioned between Lobby and Recent Battles sections
- Uses same styling as other dashboard components

For detailed UI component documentation, see [CLANS_UI_COMPONENTS.md](./CLANS_UI_COMPONENTS.md).

## API Routes

### 1. Create Clan (Pro Only)
**POST** `/api/clans/create`

**Permission Check:**
```typescript
if (!limits.canCreateClans) {
  // Only Pro users can create
  return { error: 'Creating clans requires Pro' }
}
```

**Request:**
```json
{
  "name": "AP Biology 2024",
  "description": "Period 1 Biology Class",
  "is_private": true,
  "max_members": 50
}
```

**Response:**
```json
{
  "success": true,
  "clan": {
    "id": "uuid",
    "name": "AP Biology 2024",
    "code": "ABC123XY",
    "member_count": 1,
    "role": "owner"
  }
}
```

### 2. Join Clan (Pro and Free)
**POST** `/api/clans/join`

**Permission Check:**
```typescript
if (!limits.canJoinClans) {
  // Both Pro and Free can join
  return { error: 'Unable to join' }
}

if (userClanCount >= limits.maxClansPerUser) {
  // Free: 3 max, Pro: 10 max
  return { error: 'Clan limit reached' }
}
```

**Request:**
```json
{
  "code": "ABC123XY"
}
```

**Response:**
```json
{
  "success": true,
  "clan": {
    "id": "uuid",
    "name": "AP Biology 2024",
    "member_count": 2,
    "role": "member"
  }
}
```

### 3. List User's Clans
**GET** `/api/clans/list`

**Returns:** All clans user is a member of (both Pro and Free)

### 4. Leave Clan
**POST** `/api/clans/leave`

**Note:** Owners cannot leave (must delete clan or transfer ownership)

### 5. Get Clan Members
**GET** `/api/clans/members?clan_id=xxx`

**Returns:** List of all members with their stats

### 6. Get Clan Stats
**GET** `/api/clans/stats?clan_id=xxx`

**Returns:** Clan leaderboard and aggregate statistics

### 7. Create Clan Session
**POST** `/api/clans/sessions/create`

**Permission Check:**
```typescript
// Must be owner or admin
if (membership.role !== 'owner' && membership.role !== 'admin') {
  return { error: 'Only owners/admins can create sessions' }
}
```

**Request:**
```json
{
  "clan_id": "uuid",
  "topic": "Cell Biology",
  "difficulty": "medium",
  "total_questions": 20
}
```

## Permission Flow

### Creating a Clan
```
User Request → Check canCreateClans → Pro? → Create Clan → Add as Owner
                                    → Free? → Return Error (Upgrade Prompt)
```

### Joining a Clan
```
User Request → Check canJoinClans → Both Pro/Free → Check Limit → Add Member
                                  → Free: 3 max
                                  → Pro: 10 max
```

### Creating a Session
```
User Request → Check is Member → Check Role → Owner/Admin? → Create Session
                              → Member? → Return Error
```

## Code Structure

### Subscription Limits (`src/lib/subscription/limits.ts`)

```typescript
interface FeatureLimits {
  canCreateClans: boolean  // Pro only
  canJoinClans: boolean    // Both Pro and Free
  maxClansPerUser: number  // Pro: 10, Free: 3
  maxClanMembers: number   // 50 for all
}
```

### Validation Schemas (`src/lib/validation/schemas.ts`)

```typescript
// Clan creation (Pro only)
export const createClanSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  is_private: z.boolean().default(true),
  max_members: z.number().int().min(2).max(100).default(50),
})

// Join clan (Both Pro and Free)
export const joinClanSchema = z.object({
  code: z.string().length(8).regex(/^[A-Z0-9]+$/),
})
```

## Security Considerations

### Authentication
- All routes use session-based authentication
- `getUserIdFromRequest()` extracts userId from HTTP-only cookie
- No userId in request body (prevents impersonation)

### Authorization
- Clan creation: `canCreateClans` check (Pro only)
- Clan joining: `canJoinClans` check (both tiers)
- Session creation: Role check (owner/admin only)

### Input Validation
- Zod schemas validate all inputs
- Clan code format enforced (8 uppercase alphanumeric)
- Member limits enforced (prevents abuse)

### Error Handling
- Generic error messages to clients
- Detailed errors logged server-side
- No information leakage

## Testing Scenarios

### Scenario 1: Teacher Creates Classroom
1. Teacher (Pro) creates "AP Biology" clan
2. Gets join code: "ABC123XY"
3. Shares code with students
4. Students (Free) join using code
5. Teacher hosts quiz session
6. All students participate

### Scenario 2: Free User Tries to Create Clan
1. Free user attempts to create clan
2. API returns 403 with upgrade prompt
3. User sees: "Creating clans requires Pro. Upgrade to create classrooms!"

### Scenario 3: Free User Hits Limit
1. Free user joins 3 clans
2. Tries to join 4th clan
3. API returns error: "You can only join 3 clans. Leave a clan or upgrade to Pro!"

### Scenario 4: Student Tries to Host Session
1. Student (Free, member role) tries to create session
2. API returns 403: "Only owners/admins can create sessions"
3. Only teacher (owner) can host

## Migration Instructions

1. **Run the migration:**
   ```sql
   -- Execute: supabase/migrations/create-clans-system.sql
   ```

2. **Verify tables created:**
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('clans', 'clan_members', 'clan_sessions');
   ```

3. **Test functions:**
   ```sql
   SELECT generate_clan_code();  -- Should return 8-char code
   ```

4. **Verify RLS policies:**
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename IN ('clans', 'clan_members', 'clan_sessions');
   ```

## Monitoring & Analytics

### Key Metrics to Track
- Number of clans created (Pro users)
- Number of free users joining clans
- Average clan size
- Session participation rate
- Conversion rate (Free → Pro after joining clan)

### Logging
All API routes log:
- Clan creation/joining events
- Permission denials
- Error cases

## Future Enhancements

1. **Clan Templates**: Pre-configured classroom setups
2. **Bulk Operations**: Add multiple members at once
3. **Analytics Dashboard**: Detailed clan performance metrics
4. **LMS Integration**: Connect with Google Classroom, Canvas
5. **Parent Access**: View student progress (read-only)

---

**Implementation Status**: ✅ Complete  
**Last Updated**: November 2025  
**Version**: 1.0

