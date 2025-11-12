# 📋 SQL Files Checklist for Email MFA

## ✅ What You've Already Run

Since you ran `clean-and-migrate.sql`, you already have:
- ✅ `profiles` table created
- ✅ Foreign keys updated to `auth.users`
- ✅ Triggers for auto-profile creation
- ✅ RLS policies set up

## 🎯 For Email MFA - No Additional SQL Needed!

**Good news**: Email MFA with Supabase Auth doesn't require any additional SQL files! 

Supabase handles Email MFA automatically through:
- `auth.users` table (built-in)
- `auth.mfa_factors` table (built-in, managed by Supabase)
- `auth.mfa_challenges` table (built-in, managed by Supabase)

These are all managed by Supabase - you don't need to create them!

---

## 📁 SQL Files You Have (Reference)

### Already Run (from clean-and-migrate.sql):
- ✅ `profiles` table
- ✅ Foreign key updates
- ✅ Triggers and functions
- ✅ RLS policies

### Other SQL Files (Not Required for Email MFA):
- `mfa-migration.sql` - Old custom MFA (not needed, using Supabase Auth)
- `migrate-to-supabase-auth.sql` - Migration script (already done)
- `migrate-to-supabase-auth-fixed.sql` - Fixed migration (already done)
- `migrate-with-existing-data.sql` - Data migration helper (not needed)
- `setup.sql` - Original setup (replaced by clean-and-migrate.sql)
- `stripe-migration.sql` - Stripe subscriptions (separate feature)
- `vector_setup.sql` - Vector search (separate feature)

---

## ✅ What You Need to Do

### 1. Verify Database Setup (Already Done)
You've already run `clean-and-migrate.sql`, so you're good!

### 2. Enable Email MFA in Supabase Dashboard
1. Go to **Supabase Dashboard**
2. **Authentication** → **Settings**
3. **Multi-Factor Authentication**
4. Enable **Email OTP** ✅
5. Click **Save**

### 3. That's It!
No SQL needed - Supabase handles Email MFA automatically!

---

## 🔍 Verify Your Setup

Run this query in Supabase SQL Editor to verify:

```sql
-- Check profiles table exists
SELECT * FROM profiles LIMIT 1;

-- Check foreign keys point to auth.users
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name = 'users'
  AND ccu.table_schema = 'auth';
```

---

## 📝 Summary

**For Email MFA, you need:**
- ✅ Nothing! (Already done with clean-and-migrate.sql)
- ✅ Just enable Email OTP in Supabase Dashboard

**No additional SQL files required!** 🎉

Supabase Auth handles all Email MFA tables and logic automatically.

