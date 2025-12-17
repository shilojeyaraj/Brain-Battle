-- ============================================================================
-- FIND USER AND DOCUMENTS - Run this to see all users and their documents
-- ============================================================================
-- This will help you find your actual user ID and see if documents exist
-- ============================================================================

-- 1. Show all users (last 10)
SELECT 
  'All Users' as check_type,
  id as user_id,
  username,
  email,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. Show total document count
SELECT 
  'Total Documents' as check_type,
  COUNT(*) as total_count
FROM public.documents;

-- 3. Show documents grouped by user_id (last 20 documents)
SELECT 
  'Documents by User' as check_type,
  user_id,
  uploaded_by,
  COUNT(*) as document_count,
  COUNT(DISTINCT content_hash) as unique_files,
  MIN(created_at) as first_upload,
  MAX(created_at) as last_upload
FROM public.documents
GROUP BY user_id, uploaded_by
ORDER BY last_upload DESC
LIMIT 20;

-- 4. Show all documents with details (last 20)
SELECT 
  id,
  user_id,
  uploaded_by,
  original_name,
  file_size,
  LEFT(content_hash, 16) as hash_preview,
  created_at,
  CASE 
    WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN 'This Month'
    ELSE 'Previous Month'
  END as month_category
FROM public.documents
ORDER BY created_at DESC
LIMIT 20;

-- 5. Count documents this month by user
SELECT 
  user_id,
  COUNT(*) as documents_this_month
FROM public.documents
WHERE created_at >= date_trunc('month', CURRENT_DATE)
GROUP BY user_id
ORDER BY documents_this_month DESC;

-- 6. Check for any documents with NULL user fields
SELECT 
  'Documents with NULL user_id' as check_type,
  COUNT(*) as count
FROM public.documents
WHERE user_id IS NULL;

SELECT 
  'Documents with NULL uploaded_by' as check_type,
  COUNT(*) as count
FROM public.documents
WHERE uploaded_by IS NULL;

