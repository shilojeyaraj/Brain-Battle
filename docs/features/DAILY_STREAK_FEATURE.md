# Daily Streak Feature

## Overview
The Daily Streak feature tracks consecutive days of user activity based on quiz session completions. It includes a **48-hour grace period**, meaning users have 2 full days to complete a quiz before their streak breaks.

## Implementation Details

### Database Schema
- **Migration**: `supabase/migrations/add-daily-streak-tracking.sql`
- **Columns Added to `player_stats`**:
  - `daily_streak` (INTEGER): Current consecutive days of activity
  - `last_activity_date` (DATE): Date of last quiz session completion
  - `longest_streak` (INTEGER): Best streak ever achieved
- **Database Function**: `calculate_daily_streak(p_user_id UUID)`
  - Calculates streak with 48-hour grace period logic
  - Updates `player_stats` automatically
  - Returns streak data including days until break

### Streak Calculation Logic

#### Grace Period Rules
1. **Active Today**: Streak continues or increments
2. **Active Yesterday**: Streak continues (within grace period)
3. **Active 2 Days Ago**: Streak continues if no activity yesterday (grace period applies)
4. **3+ Days Inactive**: Streak resets to 0

#### Example Scenarios
- **Day 1**: Complete quiz → Streak = 1
- **Day 2**: Complete quiz → Streak = 2
- **Day 3**: No activity → Streak = 2 (grace period)
- **Day 4**: Complete quiz → Streak = 3 (grace period saved it!)
- **Day 5-6**: No activity → Streak = 3 (still in grace period)
- **Day 7**: No activity → Streak = 0 (grace period expired)

### API Endpoints

#### `GET /api/user/streak`
- Fetches current streak data for authenticated user
- Returns:
  - `currentStreak`: Current consecutive days
  - `longestStreak`: Best streak achieved
  - `lastActivityDate`: Date of last activity
  - `isActiveToday`: Whether user completed a quiz today
  - `daysUntilBreak`: Days remaining in grace period

### Components

#### `StreakDisplay` Component
- **Location**: `src/components/dashboard/streak-display.tsx`
- **Features**:
  - Animated flame icon with pulse effect
  - Current streak number with day/days label
  - Motivational messages based on streak length
  - Milestone indicators (7, 14, 30, 100 days)
  - Warning indicator when streak is at risk
  - Best streak display
  - Days until break countdown
- **Visibility**:
  - Shows for users with streak > 0
  - Shows placeholder during tutorial for new users
  - Hidden for users with 0 streak (outside tutorial)

### Integration Points

#### Quiz Results API
- **File**: `src/app/api/quiz-results/route.ts`
- **Action**: Automatically calculates and updates streak after quiz completion
- **Timing**: Runs after stats update, doesn't fail request if streak update fails

#### User Stats API
- **File**: `src/app/api/user-stats/route.ts`
- **Action**: Includes streak fields in player_stats query
- **Fields**: `daily_streak`, `longest_streak`, `last_activity_date`

#### Dashboard Integration
- **File**: `src/app/dashboard/page.tsx`
- **Location**: Displayed after subscription banner, before main content grid
- **Auto-refresh**: Updates every 5 minutes

### Tutorial Integration

#### Tutorial Step
- **Location**: `src/components/tutorial/dashboard-tutorial.tsx`
- **Step ID**: `streak`
- **Position**: Near the end (before final "You're All Set!" step)
- **Description**: Explains the streak feature, grace period, and importance of daily activity
- **Target**: `[data-tutorial="streak-display"]`

### Visual Design

#### Color Scheme
- **0-6 days**: Orange gradient (from-orange-300 to-orange-400)
- **7-13 days**: Orange gradient (from-orange-400 to-orange-500)
- **14-29 days**: Orange gradient (from-orange-500 to-orange-600)
- **30+ days**: Orange to red gradient (from-orange-500 to-red-600)

#### Animations
- Flame icon: Pulsing scale and glow effect
- Milestone badges: Highlighted when achieved
- At-risk indicator: Ring animation when streak is in danger

#### Messages
- **0-2 days**: "🔥 Building your streak!"
- **3-6 days**: "🔥 Keep it going!"
- **7-13 days**: "🔥 Great job!"
- **14-29 days**: "🔥 Amazing consistency!"
- **30-99 days**: "🔥 Incredible dedication!"
- **100+ days**: "🔥 LEGENDARY STREAK!"

### Milestones
- **7 days**: First milestone
- **14 days**: Two weeks
- **30 days**: One month
- **100 days**: Legendary achievement

### Error Handling
- Streak calculation failures don't break quiz completion
- Fallback manual calculation if database function unavailable
- Graceful degradation if API calls fail
- Component handles loading and error states

### Performance
- Database function for efficient calculation
- Indexed queries for fast lookups
- Client-side auto-refresh every 5 minutes
- Lazy loading of streak data

## Usage

### For Users
1. Complete a quiz to start your streak
2. Complete at least one quiz per day to maintain streak
3. You have a 48-hour grace period if you miss a day
4. View your streak at the top of the dashboard
5. Track milestones as you progress

### For Developers
```typescript
// Calculate streak manually
import { calculateUserStreak } from '@/lib/streak/streak-calculator'
const streak = await calculateUserStreak(userId)

// Fetch streak via API
const response = await fetch('/api/user/streak')
const streakData = await response.json()
```

## Future Enhancements
- Streak rewards/bonuses
- Streak leaderboard
- Streak notifications
- Streak sharing
- Streak history visualization


