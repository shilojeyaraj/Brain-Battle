-- Diagnostic script to check users table setup
-- Run this in Supabase SQL Editor to diagnose why users aren't appearing

-- ============================================
-- Step 1: Check if users table exists
-- ============================================
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_name = 'users' 
  AND table_schema IN ('public', 'auth');

-- ============================================
-- Step 2: Check users table structure
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- ============================================
-- Step 3: Check RLS status on users table
-- ============================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'users';

-- ============================================
-- Step 4: Count existing users
-- ============================================
SELECT 
  COUNT(*) as total_users,
  COUNT(DISTINCT id) as unique_user_ids,
  MIN(created_at) as oldest_user,
  MAX(created_at) as newest_user
FROM public.users;

-- ============================================
-- Step 5: Show recent users (last 10)
-- ============================================
SELECT 
  id,
  username,
  email,
  created_at,
  updated_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- Step 6: Check for any constraints or triggers
-- ============================================
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass;

-- ============================================
-- Step 7: Check for triggers on users table
-- ============================================
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'users';

-- ============================================
-- Step 8: Verify admin client can access table
-- ============================================
-- This query should work if the table exists and is accessible
-- If this fails, there's a permissions or table structure issue
SELECT 
  'Table exists and is accessible' as status,
  COUNT(*) as user_count
FROM public.users;

