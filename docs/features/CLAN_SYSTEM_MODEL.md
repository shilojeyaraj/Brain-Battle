# Clan/Classroom System - Freemium Model

## Overview

The clan/classroom system uses a **freemium model** that allows teachers (Pro users) to create and manage clans, while students (Free users) can participate without needing a Pro account.

## Access Model

### Pro Users (Teachers/Organizers)
- ✅ **Can CREATE clans/classrooms** (requires Pro)
- ✅ Can join up to **10 clans**
- ✅ Can host **clan-wide quiz sessions**
- ✅ Can manage clan members (as owner/admin)
- ✅ Full access to all clan features

### Free Users (Students/Participants)
- ❌ **Cannot CREATE clans** (must upgrade to Pro)
- ✅ **Can JOIN clans** (up to 3 clans)
- ✅ Can participate in **clan-wide quiz sessions**
- ✅ Can view **clan leaderboard and stats**
- ✅ Can see **clan members**
- ✅ Can leave clans

## Use Cases

### 1. Classroom Scenario
- **Teacher (Pro)**: Creates a classroom clan, hosts quiz sessions for the whole class
- **Students (Free)**: Join the classroom clan using the code, participate in sessions, compete on leaderboard
- **Result**: Only 1 Pro account needed (the teacher)

### 2. Study Group Scenario
- **Group Leader (Pro)**: Creates a study group clan
- **Friends (Free)**: Join the study group, track progress together
- **Result**: Only 1 Pro account needed (the organizer)

### 3. Multiple Classes
- **Teacher (Pro)**: Can create up to 10 different classroom clans
- **Students (Free)**: Can join up to 3 clans (enough for multiple classes)
- **Result**: Flexible for teachers with multiple classes

## Limits

| Feature | Pro Users | Free Users |
|---------|-----------|------------|
| Create Clans | ✅ Unlimited | ❌ Not allowed |
| Join Clans | ✅ Up to 10 | ✅ Up to 3 |
| Host Clan Sessions | ✅ Yes | ❌ No (must be owner/admin) |
| Join Clan Sessions | ✅ Yes | ✅ Yes |
| View Clan Stats | ✅ Yes | ✅ Yes |
| Max Clan Members | 50 | 50 (set by creator) |

## Benefits

1. **Teacher-Friendly**: Only the teacher needs Pro, students can participate for free
2. **Scalable**: One Pro account can manage up to 10 clans with 50 members each (500 total participants)
3. **Fair**: Free users get meaningful access (join, participate, view stats)
4. **Conversion**: Free users see value and may upgrade to create their own clans

## Implementation Details

- Clan creation is gated by `canCreateClans` (Pro only)
- Clan joining is gated by `canJoinClans` (both Pro and Free)
- Free users limited to 3 clans to prevent abuse
- Clan owners/admins (usually Pro) can create sessions
- All members can participate in sessions regardless of tier

## Marketing Message

**For Teachers:**
> "Create private classrooms for your students. Only you need Pro - students join for free!"

**For Students:**
> "Join your teacher's classroom or create study groups. Free users can join up to 3 clans!"

