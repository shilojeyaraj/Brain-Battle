-- ============================================================================
-- SIMPLE DOCUMENT CHECK - Run this first to see what's in your database
-- ============================================================================
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID
-- ============================================================================

-- 1. Check if user exists
SELECT 
  'User Check' as check_type,
  id,
  username,
  email,
  created_at
FROM public.users
WHERE id = 'YOUR_USER_ID_HERE'::uuid;

-- 2. Count ALL documents (any user)
SELECT 
  'Total documents in database' as check_type,
  COUNT(*) as total_count
FROM public.documents;

-- 3. Count documents by user_id
SELECT 
  'Documents by user_id' as check_type,
  COUNT(*) as count
FROM public.documents
WHERE user_id = 'YOUR_USER_ID_HERE'::uuid;

-- 4. Count documents by uploaded_by
SELECT 
  'Documents by uploaded_by' as check_type,
  COUNT(*) as count
FROM public.documents
WHERE uploaded_by = 'YOUR_USER_ID_HERE'::uuid;

-- 5. Show ALL documents (last 10, any user) - to see if documents table has any data
SELECT 
  id,
  user_id,
  uploaded_by,
  original_name,
  file_size,
  created_at
FROM public.documents
ORDER BY created_at DESC
LIMIT 10;

-- 6. Documents this month (by user_id)
SELECT 
  'Documents this month (user_id)' as check_type,
  COUNT(*) as count,
  date_trunc('month', CURRENT_DATE) as month_start
FROM public.documents
WHERE user_id = 'YOUR_USER_ID_HERE'::uuid
  AND created_at >= date_trunc('month', CURRENT_DATE);

-- 7. Documents this month (by uploaded_by)
SELECT 
  'Documents this month (uploaded_by)' as check_type,
  COUNT(*) as count,
  date_trunc('month', CURRENT_DATE) as month_start
FROM public.documents
WHERE uploaded_by = 'YOUR_USER_ID_HERE'::uuid
  AND created_at >= date_trunc('month', CURRENT_DATE);

