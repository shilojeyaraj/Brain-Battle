-- ============================================================================
-- DIAGNOSTIC SCRIPT: Check Document Tracking for User
-- ============================================================================
-- This script helps diagnose why document counts might not be updating
-- 
-- USAGE:
-- 1. Replace 'YOUR_USER_ID_HERE' with your actual user ID below
-- 2. Run this script in Supabase SQL Editor
-- 3. Review the results to see what's happening with document tracking
-- ============================================================================

-- SET YOUR USER ID HERE (replace with your actual user ID):
-- Example: '19d3c81b-a1fd-4850-bc9a-d32ce90f765f'
DO $$
DECLARE
  user_id_to_check UUID := '19d3c81b-a1fd-4850-bc9a-d32ce90f765f'; -- ⚠️ REPLACE WITH YOUR USER ID
  rec RECORD;
  doc_count INT;
  dup_count INT;
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'DOCUMENT TRACKING DIAGNOSTIC FOR USER: %', user_id_to_check;
  RAISE NOTICE '============================================================================';
  
  -- 1. Check if user exists in users table
  RAISE NOTICE '';
  RAISE NOTICE '=== 1. USER CHECK ===';
  IF EXISTS (SELECT 1 FROM public.users WHERE id = user_id_to_check) THEN
    RAISE NOTICE '✅ User EXISTS in users table';
    FOR rec IN SELECT id, username, email, created_at FROM public.users WHERE id = user_id_to_check
    LOOP
      RAISE NOTICE '   User ID: %', rec.id;
      RAISE NOTICE '   Username: %', rec.username;
      RAISE NOTICE '   Email: %', rec.email;
      RAISE NOTICE '   Created: %', rec.created_at;
    END LOOP;
  ELSE
    RAISE NOTICE '❌ User does NOT exist in users table - this will cause foreign key errors!';
    RAISE NOTICE '   Documents cannot be inserted without the user existing first.';
  END IF;
  
  -- 2. Count documents by user_id (new schema)
  RAISE NOTICE '';
  RAISE NOTICE '=== 2. DOCUMENTS BY user_id ===';
  FOR rec IN 
    SELECT 
      COUNT(*) as doc_count,
      COUNT(DISTINCT content_hash) as unique_docs,
      MIN(created_at) as first_doc,
      MAX(created_at) as last_doc
    FROM public.documents
    WHERE user_id = user_id_to_check
  LOOP
    RAISE NOTICE 'Total documents: %', rec.doc_count;
    RAISE NOTICE 'Unique files (by hash): %', rec.unique_docs;
    RAISE NOTICE 'First document: %', rec.first_doc;
    RAISE NOTICE 'Last document: %', rec.last_doc;
  END LOOP;
  
  -- 3. Count documents by uploaded_by (legacy schema)
  RAISE NOTICE '';
  RAISE NOTICE '=== 3. DOCUMENTS BY uploaded_by ===';
  FOR rec IN 
    SELECT 
      COUNT(*) as doc_count,
      COUNT(DISTINCT content_hash) as unique_docs,
      MIN(created_at) as first_doc,
      MAX(created_at) as last_doc
    FROM public.documents
    WHERE uploaded_by = user_id_to_check
  LOOP
    RAISE NOTICE 'Total documents: %', rec.doc_count;
    RAISE NOTICE 'Unique files (by hash): %', rec.unique_docs;
    RAISE NOTICE 'First document: %', rec.first_doc;
    RAISE NOTICE 'Last document: %', rec.last_doc;
  END LOOP;
  
  -- 4. Count documents this month (by user_id)
  RAISE NOTICE '';
  RAISE NOTICE '=== 4. DOCUMENTS THIS MONTH (user_id) ===';
  FOR rec IN 
    SELECT 
      COUNT(*) as doc_count,
      date_trunc('month', CURRENT_DATE) as month_start
    FROM public.documents
    WHERE user_id = user_id_to_check
      AND created_at >= date_trunc('month', CURRENT_DATE)
  LOOP
    RAISE NOTICE 'Documents this month: %', rec.doc_count;
    RAISE NOTICE 'Month start date: %', rec.month_start;
  END LOOP;
  
  -- 5. Count documents this month (by uploaded_by)
  RAISE NOTICE '';
  RAISE NOTICE '=== 5. DOCUMENTS THIS MONTH (uploaded_by) ===';
  FOR rec IN 
    SELECT 
      COUNT(*) as doc_count,
      date_trunc('month', CURRENT_DATE) as month_start
    FROM public.documents
    WHERE uploaded_by = user_id_to_check
      AND created_at >= date_trunc('month', CURRENT_DATE)
  LOOP
    RAISE NOTICE 'Documents this month: %', rec.doc_count;
    RAISE NOTICE 'Month start date: %', rec.month_start;
  END LOOP;
  
  -- 6. Show all documents for this user (detailed)
  RAISE NOTICE '';
  RAISE NOTICE '=== 6. ALL DOCUMENTS FOR USER (detailed) ===';
  doc_count := 0;
  BEGIN
    FOR rec IN 
      SELECT 
        id,
        user_id,
        uploaded_by,
        original_name,
        file_type,
        file_size,
        LEFT(content_hash, 16) as hash_preview,
        created_at,
        updated_at,
        CASE 
          WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN 'This Month'
          ELSE 'Previous Month'
        END as month_category
      FROM public.documents
      WHERE user_id = user_id_to_check 
         OR uploaded_by = user_id_to_check
      ORDER BY created_at DESC
      LIMIT 20
    LOOP
      doc_count := doc_count + 1;
      RAISE NOTICE 'Doc #%: % | Name: % | Size: % bytes | Created: % | Category: %', 
        doc_count, rec.id, rec.original_name, rec.file_size, rec.created_at, rec.month_category;
      RAISE NOTICE '   user_id: %, uploaded_by: %, hash: %...', 
        rec.user_id, rec.uploaded_by, rec.hash_preview;
    END LOOP;
    IF doc_count = 0 THEN
      RAISE NOTICE '❌ NO DOCUMENTS FOUND for this user!';
    END IF;
  END;
  
  -- 7. Check for documents with NULL user_id or uploaded_by
  RAISE NOTICE '';
  RAISE NOTICE '=== 7. DOCUMENTS WITH NULL USER FIELDS ===';
  FOR rec IN 
    SELECT COUNT(*) as null_count
    FROM public.documents
    WHERE (user_id IS NULL AND uploaded_by IS NULL)
       OR (user_id = user_id_to_check AND uploaded_by IS NULL)
       OR (user_id IS NULL AND uploaded_by = user_id_to_check)
  LOOP
    IF rec.null_count > 0 THEN
      RAISE NOTICE '⚠️ Found % documents with NULL user fields', rec.null_count;
    ELSE
      RAISE NOTICE '✅ No documents with NULL user fields';
    END IF;
  END LOOP;
  
  -- 8. Check for duplicate content_hashes (same file uploaded multiple times)
  RAISE NOTICE '';
  RAISE NOTICE '=== 8. DUPLICATE CONTENT HASHES ===';
  dup_count := 0;
  BEGIN
    FOR rec IN 
      SELECT 
        content_hash,
        COUNT(*) as upload_count,
        array_agg(id) as document_ids,
        array_agg(created_at ORDER BY created_at) as created_dates
      FROM public.documents
      WHERE (user_id = user_id_to_check OR uploaded_by = user_id_to_check)
        AND content_hash IS NOT NULL
      GROUP BY content_hash
      HAVING COUNT(*) > 1
      LIMIT 10
    LOOP
      dup_count := dup_count + 1;
      RAISE NOTICE 'Duplicate #%: Hash %... | Uploaded % times | IDs: %', 
        dup_count, LEFT(rec.content_hash, 16), rec.upload_count, rec.document_ids;
      RAISE NOTICE '   Dates: %', rec.created_dates;
    END LOOP;
    IF dup_count = 0 THEN
      RAISE NOTICE '✅ No duplicate content hashes found';
    END IF;
  END;
  
  -- 9. Summary and recommendations
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'SUMMARY AND RECOMMENDATIONS:';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'If document count is 0, check:';
  RAISE NOTICE '1. ✅ User exists in users table (see check #1)';
  RAISE NOTICE '2. ✅ Documents were actually inserted (see check #6)';
  RAISE NOTICE '3. ✅ created_at dates are in current month (see check #4 and #5)';
  RAISE NOTICE '4. ✅ user_id and uploaded_by are set correctly (see check #6)';
  RAISE NOTICE '';
  RAISE NOTICE 'Common issues:';
  RAISE NOTICE '- User not in users table → Run ensureUserExists or create user manually';
  RAISE NOTICE '- Documents created in previous month → Count only shows current month';
  RAISE NOTICE '- Foreign key errors → User must exist before documents can be inserted';
  RAISE NOTICE '- Upsert updating instead of inserting → Same file uploaded multiple times';
  RAISE NOTICE '============================================================================';
  
END $$;

-- Also run these SELECT queries to see the data directly:
-- (Uncomment and replace YOUR_USER_ID_HERE with your actual user ID)

/*
-- Quick count check
SELECT 
  'Total documents (user_id)' as check_type,
  COUNT(*) as count
FROM public.documents
WHERE user_id = 'YOUR_USER_ID_HERE'::uuid;

SELECT 
  'Total documents (uploaded_by)' as check_type,
  COUNT(*) as count
FROM public.documents
WHERE uploaded_by = 'YOUR_USER_ID_HERE'::uuid;

SELECT 
  'Documents this month (user_id)' as check_type,
  COUNT(*) as count
FROM public.documents
WHERE user_id = 'YOUR_USER_ID_HERE'::uuid
  AND created_at >= date_trunc('month', CURRENT_DATE);

SELECT 
  'Documents this month (uploaded_by)' as check_type,
  COUNT(*) as count
FROM public.documents
WHERE uploaded_by = 'YOUR_USER_ID_HERE'::uuid
  AND created_at >= date_trunc('month', CURRENT_DATE);

-- Show all documents
SELECT 
  id,
  original_name,
  file_size,
  created_at,
  user_id,
  uploaded_by,
  CASE 
    WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN 'This Month'
    ELSE 'Previous Month'
  END as month_category
FROM public.documents
WHERE user_id = 'YOUR_USER_ID_HERE'::uuid 
   OR uploaded_by = 'YOUR_USER_ID_HERE'::uuid
ORDER BY created_at DESC;
*/
