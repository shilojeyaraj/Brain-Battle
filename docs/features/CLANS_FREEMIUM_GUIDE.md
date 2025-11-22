# Clans/Classrooms System - Freemium Model Guide

## Overview

The Brain Battle clan system uses a **freemium model** designed to make it accessible for classrooms and study groups. Only the **clan creator/organizer** needs a Pro account, while all **members/participants** can use the free tier.

## Business Model

### Core Principle
**"One Pro account enables unlimited free participation"**

This model is inspired by platforms like:
- **Kahoot**: Teachers pay, students play for free
- **Zoom**: Host pays, participants join for free
- **Discord**: Server boosters pay, members use for free

### Why This Model Works

1. **Low Barrier to Entry**: Students don't need to pay to participate
2. **High Value for Teachers**: One Pro account can manage entire classes
3. **Natural Conversion**: Free users see value and may upgrade to create their own clans
4. **Scalable**: One Pro account = up to 500 participants (10 clans × 50 members)

## Access Levels

### 👨‍🏫 Pro Users (Clan Creators)

**Can:**
- ✅ **CREATE clans/classrooms** (Pro feature)
- ✅ Join up to **10 clans**
- ✅ **Host clan-wide quiz sessions** (like Kahoot)
- ✅ Manage clan members (promote to admin, remove members)
- ✅ View detailed clan analytics
- ✅ Set clan privacy settings

**Use Cases:**
- Teachers creating classroom clans
- Study group organizers
- Coaches managing team practice sessions
- Corporate trainers running workshops

### 👨‍🎓 Free Users (Clan Members)

**Can:**
- ❌ **Cannot CREATE clans** (must upgrade to Pro)
- ✅ **JOIN clans** (up to 3 clans)
- ✅ **Participate in clan quiz sessions**
- ✅ View clan leaderboard and stats
- ✅ See clan member list
- ✅ Leave clans

**Use Cases:**
- Students joining teacher's classroom
- Friends joining study groups
- Team members joining practice sessions
- Workshop participants

## Feature Comparison

| Feature | Pro (Creator) | Free (Member) |
|---------|---------------|---------------|
| **Create Clans** | ✅ Unlimited | ❌ Not allowed |
| **Join Clans** | ✅ Up to 10 | ✅ Up to 3 |
| **Host Sessions** | ✅ Yes | ❌ No (must be owner/admin) |
| **Join Sessions** | ✅ Yes | ✅ Yes |
| **View Stats** | ✅ Yes | ✅ Yes |
| **Manage Members** | ✅ Yes (as owner/admin) | ❌ No |
| **Max Clan Size** | 50 members | 50 members (set by creator) |

## Limits & Constraints

### Pro Users
- **Max Clans Created**: Unlimited (but can only join 10 total)
- **Max Clans Joined**: 10 (includes own clans)
- **Max Members per Clan**: 50
- **Total Participants**: Up to 500 (10 clans × 50 members)

### Free Users
- **Max Clans Joined**: 3 (prevents abuse)
- **Can Create Clans**: No (upgrade required)
- **Max Members per Clan**: 50 (set by creator)

## Real-World Scenarios

### Scenario 1: High School Classroom
**Setup:**
- Teacher (Pro) creates "AP Biology 2024" clan
- 30 students (Free) join using clan code
- Teacher hosts weekly quiz sessions

**Cost:** $4.99/month (teacher only)

**Benefits:**
- All students participate for free
- Teacher tracks class performance
- Students compete on class leaderboard
- No student payment barriers

### Scenario 2: Multiple Classes
**Setup:**
- Teacher (Pro) creates 5 different classroom clans:
  - "AP Biology Period 1"
  - "AP Biology Period 2"
  - "Honors Chemistry"
  - "Study Hall Group A"
  - "Study Hall Group B"
- Each class has 20-30 students (Free)

**Cost:** $4.99/month (teacher only)

**Scale:** 1 Pro account = 150+ students

### Scenario 3: Study Group
**Setup:**
- Group leader (Pro) creates "MCAT Study Group" clan
- 15 friends (Free) join
- Leader hosts practice sessions

**Cost:** $4.99/month (leader only)

**Benefits:**
- Friends can participate without paying
- Leader can track group progress
- Creates incentive for others to upgrade

### Scenario 4: University Course
**Setup:**
- TA (Pro) creates "CS101 Discussion Section" clan
- 50 students (Free) join
- TA hosts review sessions before exams

**Cost:** $4.99/month (TA only)

**Scale:** 1 Pro account = 50 students

## Implementation Details

### Permission Checks

The system uses two separate flags:

```typescript
canCreateClans: boolean  // Pro only - can CREATE clans
canJoinClans: boolean    // Both Pro and Free - can JOIN clans
```

### API Route Permissions

| Route | Pro Required? | Free Allowed? |
|-------|---------------|---------------|
| `POST /api/clans/create` | ✅ Yes | ❌ No |
| `POST /api/clans/join` | ❌ No | ✅ Yes |
| `GET /api/clans/list` | ❌ No | ✅ Yes |
| `POST /api/clans/leave` | ❌ No | ✅ Yes |
| `GET /api/clans/members` | ❌ No | ✅ Yes |
| `GET /api/clans/stats` | ❌ No | ✅ Yes |
| `POST /api/clans/sessions/create` | ✅ Yes* | ❌ No* |

*Only clan owners/admins can create sessions (usually Pro users)

### Code Examples

#### Creating a Clan (Pro Only)
```typescript
// Check if user can create clans
const limits = await getUserLimits(userId)
if (!limits.canCreateClans) {
  return { error: 'Creating clans requires Pro. Upgrade to create classrooms!' }
}
```

#### Joining a Clan (Both Pro and Free)
```typescript
// Check if user can join clans
const limits = await getUserLimits(userId)
if (!limits.canJoinClans) {
  return { error: 'Unable to join clans' }
}

// Check clan limit
if (userClanCount >= limits.maxClansPerUser) {
  return { error: `You can only join ${limits.maxClansPerUser} clans` }
}
```

## Marketing Messages

### For Teachers
> **"Create private classrooms for your students. Only you need Pro - students join for free!"**
> 
> - One Pro account ($4.99/month) = unlimited students
> - Host Kahoot-style quiz sessions
> - Track class performance
> - Manage up to 10 different classes

### For Students
> **"Join your teacher's classroom or study groups. Free users can join up to 3 clans!"**
> 
> - Participate in classroom quizzes
> - Compete on class leaderboard
> - Join study groups
> - No payment required

### For Study Groups
> **"Organize study sessions with friends. Only the organizer needs Pro!"**
> 
> - Create private study groups
> - Host practice sessions
> - Track group progress
> - Friends join for free

## Conversion Strategy

### Free User Journey
1. **Discovery**: Student joins teacher's clan (free)
2. **Engagement**: Participates in sessions, sees value
3. **Desire**: Wants to create own study group
4. **Conversion**: Upgrades to Pro to create clan

### Conversion Points
- Free users hit 3-clan limit → "Upgrade to join more clans!"
- Free users want to create clan → "Upgrade to Pro to create your own!"
- Free users want to host sessions → "Upgrade to Pro to host sessions!"

## Technical Architecture

### Database Schema
- `clans` table: Stores clan info (created by Pro users)
- `clan_members` table: Links users to clans (both Pro and Free)
- `clan_sessions` table: Links quiz sessions to clans

### Security
- Session-based authentication (HTTP-only cookies)
- Role-based permissions (owner/admin/member)
- Input validation (Zod schemas)
- Error sanitization (no info leakage)

### Rate Limiting
- Clan creation: 10 per minute (Pro users)
- Clan joining: 20 per minute (both tiers)
- Session creation: 10 per minute (admins)

## Best Practices

### For Teachers
1. **Create descriptive clan names**: "AP Biology 2024 - Period 1"
2. **Share join codes securely**: Use classroom management system
3. **Host regular sessions**: Weekly quizzes keep students engaged
4. **Monitor leaderboard**: Track student progress

### For Students
1. **Join relevant clans**: Don't waste your 3-clan limit
2. **Participate actively**: More participation = better learning
3. **Leave inactive clans**: Free up slots for active ones
4. **Consider upgrading**: If you want to create your own clan

## FAQ

### Q: Can free users create clans?
**A:** No, only Pro users can create clans. Free users can join up to 3 clans.

### Q: How many students can join a clan?
**A:** Up to 50 members per clan (set by the creator).

### Q: Can a teacher manage multiple classes?
**A:** Yes! Pro users can create up to 10 clans, perfect for multiple classes.

### Q: Do students need to pay?
**A:** No! Students can join and participate for free. Only the teacher needs Pro.

### Q: What happens if a free user tries to create a clan?
**A:** They'll see an upgrade prompt: "Creating clans requires Pro. Upgrade to create classrooms!"

### Q: Can free users host sessions?
**A:** No, only clan owners/admins can host sessions. But all members can participate.

### Q: What if a free user hits the 3-clan limit?
**A:** They'll need to leave a clan before joining a new one, or upgrade to Pro to join up to 10 clans.

## Support & Troubleshooting

### Common Issues

**Issue**: "Creating clans requires Pro"
- **Solution**: User needs to upgrade to Pro to create clans

**Issue**: "You can only join 3 clans"
- **Solution**: Free user limit reached. Leave a clan or upgrade to Pro.

**Issue**: "Clan is full"
- **Solution**: Clan has reached 50 member limit. Contact clan owner.

**Issue**: "Only owners/admins can create sessions"
- **Solution**: Only clan creators (usually Pro) can host sessions.

## Future Enhancements

Potential features to consider:
- **Clan templates**: Pre-configured classroom setups
- **Bulk member management**: Add multiple students at once
- **Clan analytics dashboard**: Detailed performance metrics
- **Parent/guardian access**: View student progress
- **Integration with LMS**: Connect with Google Classroom, Canvas, etc.

---

**Last Updated**: November 2025  
**Version**: 1.0  
**Status**: Production Ready

