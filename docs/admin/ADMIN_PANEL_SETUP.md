# Admin Panel Setup Guide

## Overview

The admin panel provides secure access to user management features including:
- View all users
- Delete users
- Ban/unban users
- Grant Pro subscriptions

## Setup

### 1. Set Admin Password

Add the following environment variable to your `.env.local` file (and production environment):

```bash
ADMIN_PASSWORD=your-secure-admin-password-here
```

**⚠️ IMPORTANT**: 
- Use a strong, unique password
- Never commit this to version control
- Change it regularly
- Use different passwords for development and production

### 2. Optional: Set Admin JWT Secret

If you want a separate JWT secret for admin sessions (recommended for production):

```bash
ADMIN_JWT_SECRET=your-admin-jwt-secret-here
```

If not set, it will fall back to `SESSION_SECRET`.

## Accessing the Admin Panel

1. Navigate to `/admin/login`
2. Enter your admin password
3. You'll be redirected to `/admin` dashboard

## Features

### User Management

- **Search Users**: Search by email or username
- **View Users**: See all users with their status, subscription tier, and creation date
- **Pagination**: Navigate through users (50 per page)

### User Actions

- **Ban User**: Click the ban icon to toggle user's `is_active` status
- **Delete User**: Click the trash icon to permanently delete a user (with confirmation)

### Grant Pro Subscription

1. Enter either the user's **email** or **username**
2. Click "Grant Pro Subscription"
3. The user will receive:
   - `subscription_tier`: `pro`
   - `subscription_status`: `active`
   - `subscription_current_period_end`: 1 year from now

## API Endpoints

All admin endpoints require authentication via admin session cookie.

### Authentication
- `POST /api/admin/login` - Authenticate with password
- `POST /api/admin/logout` - Clear admin session
- `GET /api/admin/check` - Check if authenticated

### User Management
- `GET /api/admin/users` - List users (with pagination and search)
- `DELETE /api/admin/users/[userId]` - Delete a user
- `PATCH /api/admin/users/[userId]` - Update user (ban/unban, subscription)
- `POST /api/admin/users/grant-pro` - Grant pro subscription by email/username

## Security

- Admin authentication is separate from user authentication
- Admin sessions expire after 8 hours
- All admin endpoints verify authentication before processing
- Admin password is stored in environment variables (never in database)
- Admin sessions use HTTP-only cookies

## Database Schema

The admin panel works with the existing `users` table:

```sql
- id: UUID
- username: VARCHAR
- email: VARCHAR
- is_active: BOOLEAN (used for banning)
- subscription_tier: VARCHAR (free, pro)
- subscription_status: VARCHAR (free, active, canceled, etc.)
- subscription_current_period_end: TIMESTAMP
- created_at: TIMESTAMP
- last_login: TIMESTAMP
```

## Troubleshooting

### "Invalid admin password"
- Check that `ADMIN_PASSWORD` is set in your environment variables
- Restart your development server after adding the variable
- Verify the password is correct (case-sensitive)

### "Unauthorized - admin access required"
- Your admin session may have expired (8 hours)
- Log out and log back in
- Clear browser cookies if issues persist

### User not found when granting pro
- Verify the email/username is correct
- Check that the user exists in the database
- Ensure you're entering either email OR username (not both required)

## Best Practices

1. **Use Strong Passwords**: Admin password should be at least 16 characters with mixed case, numbers, and symbols
2. **Rotate Passwords**: Change admin password regularly
3. **Limit Access**: Only share admin password with trusted team members
4. **Monitor Activity**: Check server logs for admin actions
5. **Backup Before Deletion**: Always backup data before deleting users
6. **Document Changes**: Keep a log of admin actions for audit purposes

## Future Enhancements

- Admin activity logging
- Role-based permissions
- Bulk user operations
- User statistics dashboard
- System health monitoring

