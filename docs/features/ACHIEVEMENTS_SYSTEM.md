# Achievements System

## Overview
A comprehensive achievements/badges system that tracks user accomplishments and rewards them with XP bonuses. Achievements are automatically unlocked based on user stats and activity.

## Database Schema

### Tables

#### `achievement_definitions`
Stores all available achievements in the system.

**Columns:**
- `id` (UUID): Primary key
- `code` (VARCHAR): Unique identifier (e.g., 'first_win', 'streak_7_days')
- `name` (VARCHAR): Display name
- `description` (TEXT): Achievement description
- `icon` (VARCHAR): Icon identifier
- `category` (VARCHAR): Achievement category (wins, streaks, accuracy, activity, level, special)
- `rarity` (VARCHAR): Rarity level (common, rare, epic, legendary)
- `xp_reward` (INTEGER): XP bonus for unlocking
- `requirement_type` (VARCHAR): Type of requirement
- `requirement_value` (JSONB): Requirement parameters
- `is_active` (BOOLEAN): Whether achievement is active

#### `achievements`
Tracks which achievements each user has earned.

**Columns:**
- `id` (UUID): Primary key
- `user_id` (UUID): User who earned the achievement
- `achievement_code` (VARCHAR): Reference to achievement definition
- `progress` (JSONB): Progress tracking data
- `earned_at` (TIMESTAMPTZ): When achievement was earned
- `xp_earned` (INTEGER): XP reward received

## Achievement Categories

### Win-Based Achievements
- **First Victory**: Win your first quiz battle (50 XP)
- **Decade Warrior**: Win 10 quiz battles (200 XP)
- **Century Champion**: Win 100 quiz battles (1000 XP)
- **Undefeated**: Win 5 battles in a row (300 XP)
- **Unbeatable**: Win 10 battles in a row (750 XP)

### Streak-Based Achievements (Daily Activity)
- **Consistency Starter**: 3-day study streak (100 XP)
- **Week Warrior**: 7-day study streak (250 XP)
- **Fortnight Fighter**: 14-day study streak (500 XP)
- **Monthly Master**: 30-day study streak (1000 XP)
- **Centurion**: 100-day study streak (5000 XP)

### Accuracy-Based Achievements
- **Sharp Shooter**: 80% accuracy or higher (200 XP)
- **Marksman**: 90% accuracy or higher (500 XP)
- **Perfect Score**: Get 100% on a quiz (750 XP)
- **Perfectionist**: Get 100% on 5 quizzes (2000 XP)

### Activity-Based Achievements
- **Knowledge Seeker**: Answer 100 questions (150 XP)
- **Scholar**: Answer 500 questions (500 XP)
- **Master Student**: Answer 1,000 questions (1500 XP)
- **Quiz Master**: Complete 50 quiz sessions (400 XP)
- **Dedicated Learner**: Complete 200 quiz sessions (2000 XP)

### Level-Based Achievements
- **Rising Star**: Reach level 10 (200 XP)
- **Experienced**: Reach level 25 (500 XP)
- **Veteran**: Reach level 50 (1500 XP)
- **Legend**: Reach level 100 (5000 XP)

### Special Achievements
- **First Steps**: Complete your first quiz (25 XP)
- **Speed Demon**: Answer a question in under 5 seconds (150 XP)
- **Social Butterfly**: Join 10 multiplayer rooms (300 XP)
- **Team Player**: Win 5 multiplayer battles (600 XP)
- **Early Adopter**: Join Brain Battle in the first month (500 XP)

## API Endpoints

### `POST /api/achievements/check`
Checks and unlocks achievements for the authenticated user.

**Request Body (optional):**
```json
{
  "isPerfectScore": true,
  "answerTime": 3.5,
  "isMultiplayer": true,
  "isWin": true
}
```

**Response:**
```json
{
  "success": true,
  "unlocked": [
    {
      "code": "first_win",
      "name": "First Victory",
      "description": "Win your first quiz battle",
      "icon": "trophy",
      "rarity": "common",
      "xp_reward": 50
    }
  ],
  "count": 1
}
```

### `GET /api/achievements/list`
Gets all achievements for the authenticated user.

**Query Parameters:**
- `includeAll` (boolean): If true, includes all available achievements with progress

**Response:**
```json
{
  "success": true,
  "achievements": [...],
  "count": 5,
  "total": 30
}
```

## Integration Points

### Quiz Results API
Achievements are automatically checked after quiz completion in `/api/quiz-results`. The API:
1. Checks standard achievements based on updated stats
2. Checks custom achievements (perfect score, speed, multiplayer)
3. Returns unlocked achievements in the response

### User Stats API
The `/api/user-stats` endpoint includes user achievements with full definition data.

## Database Function

### `check_and_unlock_achievements(p_user_id UUID)`
Automatically checks user stats against achievement requirements and unlocks qualifying achievements.

**Returns:** JSONB array of newly unlocked achievements

**Logic:**
- Fetches current user stats
- Iterates through all active achievements
- Checks if user qualifies based on requirement type
- Unlocks achievement and awards XP bonus
- Returns list of newly unlocked achievements

## Requirement Types

- `win_count`: Number of wins required
- `win_streak`: Consecutive wins required
- `daily_streak`: Daily activity streak days
- `accuracy_threshold`: Minimum accuracy percentage
- `questions_answered`: Total questions answered
- `sessions_completed`: Total quiz sessions completed
- `level_reached`: Minimum level required
- `perfect_score`: Perfect score achievements (custom logic)
- `speed_answer`: Fast answer time (custom logic)
- `multiplayer_wins`: Multiplayer wins (custom logic)
- `rooms_joined`: Rooms joined (custom logic)
- `account_age`: Account age in days (custom logic)

## Custom Achievement Logic

Some achievements require application-level logic that can't be determined from stats alone:

- **Perfect Score**: Checked after quiz completion
- **Perfectionist**: Counts perfect scores across all quizzes
- **Speed Demon**: Requires answer time data
- **Team Player**: Requires multiplayer session data
- **Social Butterfly**: Requires room join tracking

These are handled in `checkCustomAchievements()` function.

## Usage

### Automatic Unlocking
Achievements are automatically checked:
- After quiz completion (via quiz-results API)
- When stats are updated
- Can be manually triggered via `/api/achievements/check`

### Manual Checking
```typescript
import { checkAndUnlockAchievements } from '@/lib/achievements/achievement-checker'

const unlocked = await checkAndUnlockAchievements(userId)
```

### Fetching User Achievements
```typescript
import { getUserAchievements } from '@/lib/achievements/achievement-checker'

const achievements = await getUserAchievements(userId)
```

## Future Enhancements
- Achievement progress tracking UI
- Achievement notification component
- Achievement gallery/badge showcase
- Achievement sharing
- Seasonal/limited-time achievements
- Achievement leaderboards

