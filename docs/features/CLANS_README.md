# Clans/Classrooms System - Documentation Index

## Overview

The Brain Battle clan system implements a **freemium model** that makes classroom and study group features accessible without requiring every participant to have a Pro account.

## Core Principle

**"One Pro account enables unlimited free participation"**

Only the **clan creator/organizer** needs Pro, while all **members/participants** can use the free tier.

## Documentation

### 📖 User Guides

1. **[Quick Start Guide](./CLANS_QUICK_START.md)**
   - Fast setup instructions
   - Example workflows
   - Common use cases

2. **[Freemium Model Guide](./CLANS_FREEMIUM_GUIDE.md)**
   - Business model explanation
   - Access levels and limits
   - Real-world scenarios
   - Marketing messages

3. **[Model Overview](./CLAN_SYSTEM_MODEL.md)**
   - Access model breakdown
   - Feature comparison table
   - Use cases and benefits

### 🔧 Technical Documentation

4. **[Implementation Guide](./CLANS_IMPLEMENTATION.md)**
   - Database schema
   - API routes
   - Permission flow
   - Code structure
   - Security considerations
   - UI components

5. **[UI Components Guide](./CLANS_UI_COMPONENTS.md)**
   - Component structure
   - Props and state
   - Usage examples
   - Styling patterns
   - Integration points

### 📱 User Documentation

6. **[User Guide](./CLANS_USER_GUIDE.md)**
   - Step-by-step instructions
   - Use cases and examples
   - Troubleshooting
   - Tips for teachers and students

## Quick Reference

### Access Levels

| Feature | Pro (Creator) | Free (Member) |
|---------|---------------|---------------|
| Create Clans | ✅ Yes | ❌ No |
| Join Clans | ✅ Up to 10 | ✅ Up to 3 |
| Host Sessions | ✅ Yes | ❌ No |
| Join Sessions | ✅ Yes | ✅ Yes |
| View Stats | ✅ Yes | ✅ Yes |

### Limits

- **Pro Users**: Can create unlimited clans, join up to 10
- **Free Users**: Can join up to 3 clans
- **Clan Size**: Up to 50 members per clan
- **Scale**: 1 Pro account = up to 500 participants (10 clans × 50 members)

## Use Cases

### 1. Classroom
- Teacher (Pro) creates classroom
- Students (Free) join with code
- Teacher hosts quiz sessions
- **Cost**: $4.99/month (teacher only)

### 2. Study Group
- Leader (Pro) creates group
- Friends (Free) join
- Leader hosts practice sessions
- **Cost**: $4.99/month (leader only)

### 3. Multiple Classes
- Teacher (Pro) creates 5-10 classrooms
- Each class has 20-50 students (Free)
- **Cost**: $4.99/month (teacher only)
- **Scale**: 1 Pro = 150+ students

## API Endpoints

| Endpoint | Method | Pro Required? | Free Allowed? |
|----------|--------|---------------|---------------|
| `/api/clans/create` | POST | ✅ Yes | ❌ No |
| `/api/clans/join` | POST | ❌ No | ✅ Yes |
| `/api/clans/list` | GET | ❌ No | ✅ Yes |
| `/api/clans/leave` | POST | ❌ No | ✅ Yes |
| `/api/clans/members` | GET | ❌ No | ✅ Yes |
| `/api/clans/stats` | GET | ❌ No | ✅ Yes |
| `/api/clans/sessions/create` | POST | ✅ Yes* | ❌ No* |

*Only clan owners/admins can create sessions (usually Pro users)

## Database Migration

Run the migration to set up the clan system:

```sql
-- File: supabase/migrations/create-clans-system.sql
```

This creates:
- `clans` table
- `clan_members` table
- `clan_sessions` table
- Helper functions
- RLS policies

## Getting Started

### For Developers

1. **Run the migration** in Supabase SQL Editor
   ```sql
   -- File: supabase/migrations/create-clans-system.sql
   ```

2. **Verify API routes** are working
   - Test `/api/clans/create` (requires Pro)
   - Test `/api/clans/join` (works for all)
   - Test `/api/clans/list` (works for all)

3. **UI Components** are already implemented:
   - `ClansSection` in dashboard
   - `CreateClanModal` and `JoinClanModal`
   - `ClanDetailPage` at `/clans/[id]`

4. **Test the freemium model**:
   - Create Pro account
   - Create a clan
   - Join with Free account
   - Verify permissions

### For Users

See the [User Guide](./CLANS_USER_GUIDE.md) for step-by-step instructions.

## Support

For questions or issues:
- **Users**: Check the [User Guide](./CLANS_USER_GUIDE.md)
- **Developers**: Review [Implementation Guide](./CLANS_IMPLEMENTATION.md) and [UI Components Guide](./CLANS_UI_COMPONENTS.md)
- **Business**: See [Freemium Guide](./CLANS_FREEMIUM_GUIDE.md)
- Contact support@brainbattle.app

## Implementation Status

✅ **Completed**:
- Database schema and migrations
- All API routes
- UI components (dashboard section, modals, detail page)
- Dashboard integration
- Error handling and validation
- Role-based permissions
- Leaderboard and stats

🚧 **Future Enhancements**:
- Clan session integration with room creation
- Admin promotion/demotion UI
- Clan chat/announcements
- Session notifications
- Clan analytics dashboard

---

**Status**: ✅ Production Ready  
**Last Updated**: December 2024

