# Achievement System Documentation

## Overview

The Brain Battle achievement system is a comprehensive gamification feature that rewards users for their accomplishments and engagement. The system uses custom-designed SVG icons from v0, badge frames with rarity-based styling, and automatic achievement unlocking based on user statistics and activity.

## Architecture

### Components

#### 1. **Achievement Icons** (`src/components/achievements/icons/achievement-icons.tsx`)

All achievement icons are custom SVG components designed in v0. Each icon is a React component that accepts `size` and `className` props.

**Available Icons:**
- **Win-Based**: `FirstVictoryIcon`, `DecadeWarriorIcon`, `CenturyChampionIcon`, `UndefeatedIcon`, `UnbeatableIcon`
- **Streak-Based**: `ConsistencyStarterIcon`, `WeekWarriorIcon`, `FortnightFighterIcon`, `MonthlyMasterIcon`, `CenturionIcon`
- **Accuracy-Based**: `SharpShooterIcon`, `MarksmanIcon`, `PerfectScoreIcon`, `PerfectionistIcon`
- **Activity-Based**: `KnowledgeSeekerIcon`, `ScholarIcon`, `MasterStudentIcon`, `QuizMasterIcon`, `DedicatedLearnerIcon`
- **Level-Based**: `RisingStarIcon`, `ExperiencedIcon`, `VeteranIcon`, `LegendIcon`
- **Special**: `FirstStepsIcon`, `SpeedDemonIcon`, `SocialButterflyIcon`, `TeamPlayerIcon`, `EarlyAdopterIcon`

**Icon Mapping:**
The `ACHIEVEMENT_ICONS` object maps icon names (as stored in the database) to their React components:

```typescript
export const ACHIEVEMENT_ICONS = {
  "first-victory": FirstVictoryIcon,
  "decade-warrior": DecadeWarriorIcon,
  "century-champion": CenturyChampionIcon,
  // ... etc
}
```

**Usage:**
```typescript
import { ACHIEVEMENT_ICONS } from "@/components/achievements/icons/achievement-icons"

const IconComponent = ACHIEVEMENT_ICONS["first-victory"]
<IconComponent size={64} className="text-blue-500" />
```

#### 2. **Badge Frames** (`src/components/achievements/badge-frame.tsx`)

Badge frames provide visual distinction based on achievement rarity. Each rarity tier has unique colors and decorative elements.

**Rarity Tiers:**
- **Common** (Gray): Simple circular frame with gray border
- **Rare** (Blue): Circular frame with corner decorations
- **Epic** (Purple): Circular frame with corner decorations and corner stars
- **Legendary** (Orange/Gold): Circular frame with corner decorations, sparkles, and animated glow effect

**Usage:**
```typescript
import { BadgeFrame } from "@/components/achievements/badge-frame"

<BadgeFrame rarity="legendary" size={128} showGlow={true}>
  <IconComponent size={80} />
</BadgeFrame>
```

#### 3. **Achievement Notification** (`src/components/achievements/achievement-notification.tsx`)

Animated toast notification that appears when a user unlocks an achievement. Features:
- Spring animations (scale, fade, slide)
- Rarity-based styling and gradients
- XP reward display
- Auto-dismiss functionality

**Props:**
```typescript
interface AchievementNotificationData {
  code: string
  name: string
  description: string
  icon: string  // Must match a key in ACHIEVEMENT_ICONS
  rarity: AchievementRarity
  xp_reward: number
}
```

**Usage:**
```typescript
import { useAchievements } from "@/hooks/use-achievements"

const { notifyAchievements } = useAchievements()

// After unlocking achievements
notifyAchievements([
  {
    code: "first-victory",
    name: "First Victory",
    description: "Win your first quiz",
    icon: "first-victory",
    rarity: "common",
    xp_reward: 10
  }
])
```

#### 4. **Achievement Gallery** (`src/components/achievements/achievement-gallery.tsx`)

Displays all achievements in a filterable grid. Features:
- Category filtering (wins, streaks, accuracy, activity, level, special)
- Rarity filtering (common, rare, epic, legendary)
- Progress tracking for locked achievements
- Completion percentage display

**Usage:**
```typescript
import { AchievementGallery } from "@/components/achievements/achievement-gallery"

<AchievementGallery userId={userId} />
```

## Database Schema

### `achievement_definitions` Table

Stores all available achievements in the system.

**Columns:**
- `id` (UUID): Primary key
- `code` (VARCHAR): Unique identifier (e.g., 'first-victory', 'decade-warrior')
- `name` (VARCHAR): Display name (e.g., "First Victory")
- `description` (TEXT): Achievement description
- `icon` (VARCHAR): **Must match a key in `ACHIEVEMENT_ICONS`** (e.g., 'first-victory', 'decade-warrior')
- `category` (VARCHAR): Achievement category ('wins', 'streaks', 'accuracy', 'activity', 'level', 'special')
- `rarity` (VARCHAR): Rarity level ('common', 'rare', 'epic', 'legendary')
- `xp_reward` (INTEGER): XP bonus for unlocking
- `requirement_type` (VARCHAR): Type of requirement (see Requirement Types below)
- `requirement_value` (JSONB): Requirement parameters
- `is_active` (BOOLEAN): Whether achievement is active

### `achievements` Table

Tracks which achievements each user has earned.

**Columns:**
- `id` (UUID): Primary key
- `user_id` (UUID): User who earned the achievement
- `achievement_code` (VARCHAR): Reference to `achievement_definitions.code`
- `progress` (JSONB): Progress tracking data
- `earned_at` (TIMESTAMPTZ): When achievement was earned
- `xp_earned` (INTEGER): XP reward received

## Requirement Types

Achievements are unlocked based on different requirement types:

### Stat-Based Requirements

These are checked automatically by the database function `check_and_unlock_achievements`:

- `win_count`: Number of quiz wins
- `win_streak`: Consecutive wins
- `daily_streak`: Consecutive days of activity
- `accuracy_threshold`: Minimum accuracy percentage
- `questions_answered`: Total questions answered
- `sessions_completed`: Total quiz sessions completed
- `level_reached`: User level reached

### Custom Requirements

These require application-level logic in `checkCustomAchievements`:

- `perfect_score`: 100% accuracy in a single quiz
- `speed_answer`: Answer questions quickly
- `multiplayer_wins`: Wins in multiplayer mode
- `rooms_joined`: Number of multiplayer rooms joined
- `account_age`: Account age in days
- `custom`: Special logic defined in code

## Achievement Unlocking Flow

### 1. Automatic Stat-Based Unlocking

When user stats are updated (e.g., after completing a quiz), the system calls:

```typescript
import { checkAndUnlockAchievements } from "@/lib/achievements/achievement-checker"

const unlocked = await checkAndUnlockAchievements(userId)
```

This triggers the database function `check_and_unlock_achievements` which:
1. Fetches user's current stats
2. Compares against all active achievement requirements
3. Unlocks any achievements that meet requirements
4. Returns list of newly unlocked achievements

### 2. Custom Achievement Checking

For achievements requiring context (e.g., perfect score, speed), call:

```typescript
import { checkCustomAchievements } from "@/lib/achievements/achievement-checker"

const unlocked = await checkCustomAchievements(userId, {
  isPerfectScore: true,
  answerTime: 45,
  isMultiplayer: false,
  isWin: true
})
```

### 3. Displaying Notifications

After unlocking achievements, display notifications:

```typescript
import { useAchievements } from "@/hooks/use-achievements"

const { notifyAchievements } = useAchievements()

// In your component
useEffect(() => {
  if (unlockedAchievements.length > 0) {
    notifyAchievements(unlockedAchievements.map(a => ({
      code: a.code,
      name: a.name,
      description: a.description,
      icon: a.icon,  // Must match ACHIEVEMENT_ICONS key
      rarity: a.rarity,
      xp_reward: a.xp_reward
    })))
  }
}, [unlockedAchievements])
```

## Icon Name Mapping

**Critical**: The `icon` field in the database must exactly match a key in `ACHIEVEMENT_ICONS`.

### Valid Icon Names:

**Win-Based:**
- `first-victory`
- `decade-warrior`
- `century-champion`
- `undefeated`
- `unbeatable`

**Streak-Based:**
- `consistency-starter`
- `week-warrior`
- `fortnight-fighter`
- `monthly-master`
- `centurion`

**Accuracy-Based:**
- `sharp-shooter`
- `marksman`
- `perfect-score`
- `perfectionist`

**Activity-Based:**
- `knowledge-seeker`
- `scholar`
- `master-student`
- `quiz-master`
- `dedicated-learner`

**Level-Based:**
- `rising-star`
- `experienced`
- `veteran`
- `legend`

**Special:**
- `first-steps`
- `speed-demon`
- `social-butterfly`
- `team-player`
- `early-adopter`

## Adding New Achievements

### Step 1: Create Icon Component

Add a new icon component to `src/components/achievements/icons/achievement-icons.tsx`:

```typescript
export function NewAchievementIcon({ size = 64, className }: AchievementIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Your SVG content */}
    </svg>
  )
}
```

### Step 2: Add to Icon Mapping

Add the icon to the `ACHIEVEMENT_ICONS` object:

```typescript
export const ACHIEVEMENT_ICONS = {
  // ... existing icons
  "new-achievement": NewAchievementIcon,
} as const
```

### Step 3: Create Database Entry

Insert into `achievement_definitions`:

```sql
INSERT INTO achievement_definitions (
  code,
  name,
  description,
  icon,  -- Must match key in ACHIEVEMENT_ICONS
  category,
  rarity,
  xp_reward,
  requirement_type,
  requirement_value,
  is_active
) VALUES (
  'new-achievement',
  'New Achievement',
  'Description here',
  'new-achievement',  -- Must match ACHIEVEMENT_ICONS key
  'special',
  'rare',
  25,
  'custom',
  '{}'::jsonb,
  true
);
```

### Step 4: Implement Unlocking Logic

If it's a custom achievement, add logic to `checkCustomAchievements` in `src/lib/achievements/achievement-checker.ts`.

## Rarity System

### Common (Gray)
- **Color**: Gray (#94a3b8)
- **Border**: Gray (#475569)
- **XP Reward**: 10 points
- **Frame**: Simple circular frame

### Rare (Blue)
- **Color**: Blue (#60a5fa)
- **Border**: Blue (#2563eb)
- **XP Reward**: 25 points
- **Frame**: Circular frame with corner decorations

### Epic (Purple)
- **Color**: Purple (#a855f7)
- **Border**: Purple (#7c3aed)
- **XP Reward**: 50 points
- **Frame**: Circular frame with corner decorations and corner stars

### Legendary (Orange/Gold)
- **Color**: Orange/Gold (#fbbf24)
- **Border**: Orange (#ea580c)
- **XP Reward**: 100 points
- **Frame**: Circular frame with corner decorations, sparkles, and animated glow

## Best Practices

1. **Icon Names**: Always use kebab-case for icon names (e.g., `first-victory`, not `firstVictory`)
2. **Database Consistency**: Ensure `icon` field in database matches `ACHIEVEMENT_ICONS` keys exactly
3. **Rarity Selection**: Choose rarity based on difficulty and XP reward
4. **Testing**: Test achievement unlocking in development before deploying
5. **Performance**: Achievement checking is optimized with database indexes
6. **User Experience**: Show notifications immediately after unlocking, but don't spam users

## API Endpoints

### GET `/api/achievements/list`

Fetches all achievements for the current user.

**Query Parameters:**
- `includeAll` (boolean): Include locked achievements

**Response:**
```json
{
  "success": true,
  "achievements": [...],
  "allAchievements": [...]
}
```

### POST `/api/achievements/check`

Manually trigger achievement checking for the current user.

**Response:**
```json
{
  "success": true,
  "unlocked": [...]
}
```

## Troubleshooting

### Icons Not Displaying

1. Check that `icon` field in database matches a key in `ACHIEVEMENT_ICONS`
2. Verify the icon component is exported correctly
3. Check browser console for errors

### Achievements Not Unlocking

1. Verify `requirement_value` JSONB is correctly formatted
2. Check database function `check_and_unlock_achievements` is working
3. Verify user stats are being updated correctly
4. Check `is_active` is `true` for the achievement

### Performance Issues

1. Ensure database indexes are created (see migration file)
2. Limit achievement checking frequency
3. Use database functions for bulk operations

## Future Enhancements

- Achievement progress tracking UI
- Achievement categories page
- Achievement leaderboards
- Seasonal/limited-time achievements
- Achievement sharing on social media
- Achievement collections/themes

