-- ============================================================================
-- QUICK DOCUMENT CHECK - Run this to quickly diagnose the issue
-- ============================================================================
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from the "All Users" query
-- ============================================================================

-- STEP 1: Find your user ID (run this first!)
SELECT 
  id as user_id,
  username,
  email,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 5;

-- STEP 2: Once you have your user_id, replace it below and run these queries:

-- Check if documents exist for your user
SELECT 
  'Documents for your user (user_id)' as check_type,
  COUNT(*) as count
FROM public.documents
WHERE user_id = 'YOUR_USER_ID_HERE'::uuid;

SELECT 
  'Documents for your user (uploaded_by)' as check_type,
  COUNT(*) as count
FROM public.documents
WHERE uploaded_by = 'YOUR_USER_ID_HERE'::uuid;

-- Check documents THIS MONTH (this is what the counter uses!)
SELECT 
  'Documents THIS MONTH (user_id)' as check_type,
  COUNT(*) as count,
  date_trunc('month', CURRENT_DATE) as month_start
FROM public.documents
WHERE user_id = 'YOUR_USER_ID_HERE'::uuid
  AND created_at >= date_trunc('month', CURRENT_DATE);

SELECT 
  'Documents THIS MONTH (uploaded_by)' as check_type,
  COUNT(*) as count,
  date_trunc('month', CURRENT_DATE) as month_start
FROM public.documents
WHERE uploaded_by = 'YOUR_USER_ID_HERE'::uuid
  AND created_at >= date_trunc('month', CURRENT_DATE);

-- Show all your documents with dates
SELECT 
  id,
  original_name,
  file_size,
  created_at,
  CASE 
    WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN '✅ This Month'
    ELSE '❌ Previous Month'
  END as month_category,
  user_id,
  uploaded_by
FROM public.documents
WHERE user_id = 'YOUR_USER_ID_HERE'::uuid 
   OR uploaded_by = 'YOUR_USER_ID_HERE'::uuid
ORDER BY created_at DESC;




