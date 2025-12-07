# Admin Panel Quick Start

## Quick Setup (2 minutes)

1. **Add admin password to `.env.local`**:
   ```bash
   ADMIN_PASSWORD=your-secure-password-here
   ```

2. **Restart your dev server** (if running)

3. **Navigate to** `/admin/login` and enter your password

4. **You're in!** Start managing users.

## Common Tasks

### Grant Pro to a User
1. Go to "Grant Pro Subscription" section
2. Enter user's email OR username
3. Click "Grant Pro Subscription"

### Ban a User
1. Find user in the table
2. Click the ban icon (yellow button)
3. User's `is_active` status will be toggled

### Delete a User
1. Find user in the table
2. Click the trash icon (red button)
3. Confirm deletion
4. ⚠️ This action cannot be undone!

### Search Users
1. Use the search box at the top right
2. Search by email or username
3. Results update automatically

## Environment Variables

Required:
- `ADMIN_PASSWORD` - Your admin password

Optional:
- `ADMIN_JWT_SECRET` - Separate JWT secret for admin sessions (defaults to SESSION_SECRET)

## Security Notes

- Admin password is stored in environment variables, never in the database
- Admin sessions expire after 8 hours
- All admin actions are logged to server console
- Use strong passwords and rotate regularly

