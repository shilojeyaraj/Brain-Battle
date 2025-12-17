-- ============================================================================
-- AUTO DOCUMENT CHECK - No replacement needed, just run it!
-- ============================================================================

-- 1. Show all users (find your user ID here)
SELECT 
  'STEP 1: ALL USERS' as step,
  id as user_id,
  username,
  email,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. Total documents in database
SELECT 
  'STEP 2: TOTAL DOCUMENTS' as step,
  COUNT(*) as total_count
FROM public.documents;

-- 3. Show ALL documents with user info
SELECT 
  'STEP 3: ALL DOCUMENTS' as step,
  d.id,
  d.user_id,
  d.uploaded_by,
  d.original_name,
  d.file_size,
  d.created_at,
  CASE 
    WHEN d.created_at >= date_trunc('month', CURRENT_DATE) THEN 'THIS MONTH'
    ELSE 'PREVIOUS MONTH'
  END as month_status
FROM public.documents d
ORDER BY d.created_at DESC
LIMIT 20;

-- 4. Documents per user THIS MONTH (this is what the counter shows!)
SELECT 
  'STEP 4: DOCUMENTS THIS MONTH BY USER' as step,
  user_id,
  COUNT(*) as docs_this_month,
  date_trunc('month', CURRENT_DATE) as month_start
FROM public.documents
WHERE created_at >= date_trunc('month', CURRENT_DATE)
GROUP BY user_id;

-- 5. Documents per user ALL TIME
SELECT 
  'STEP 5: ALL DOCUMENTS BY USER' as step,
  user_id,
  COUNT(*) as total_docs,
  MIN(created_at) as first_upload,
  MAX(created_at) as last_upload
FROM public.documents
GROUP BY user_id;

