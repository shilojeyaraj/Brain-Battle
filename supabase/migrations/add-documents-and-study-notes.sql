-- Track uploaded documents (PDFs, text files, etc.) and cached study notes

-- 1) Documents table: one row per uploaded file per user
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  storage_path TEXT,              -- path in Supabase Storage bucket (e.g. documents bucket)
  original_name TEXT,             -- original filename from user
  file_type TEXT,                 -- mime type (e.g. application/pdf)
  file_size BIGINT,               -- size in bytes
  content_hash TEXT,              -- optional hash of file contents for de-duplication
  subject TEXT,                   -- optional subject/topic tag
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure required columns exist even if an older documents table was already present
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS original_name TEXT,
  ADD COLUMN IF NOT EXISTS file_type TEXT,
  ADD COLUMN IF NOT EXISTS file_size BIGINT,
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.documents
  ALTER COLUMN user_id SET NOT NULL;

-- Foreign key to auth.users (drop then add to avoid IF NOT EXISTS syntax)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'documents_user_id_fkey'
      AND table_name = 'documents'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.documents DROP CONSTRAINT documents_user_id_fkey;
  END IF;
END $$;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ensure we can safely upsert on (user_id, content_hash)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'documents_user_content_hash_key'
      AND table_name = 'documents'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.documents DROP CONSTRAINT documents_user_content_hash_key;
  END IF;
END $$;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_user_content_hash_key
  UNIQUE (user_id, content_hash);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_content_hash ON public.documents(content_hash);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_documents_updated_at ON public.documents;
CREATE TRIGGER trigger_update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_documents_updated_at();

-- 2) Study notes cache table: one row per (document, prompt/settings) combination
CREATE TABLE IF NOT EXISTS public.study_notes_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  topic TEXT,                    -- requested topic/title
  education_level TEXT,          -- inferred or selected level (elementary, high_school, etc.)
  content_focus TEXT,            -- concept/application/both (if used)
  instructions_hash TEXT,        -- hash of combined study instructions/prompt context
  notes_json JSONB NOT NULL,     -- full notes JSON as returned by /api/notes
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.study_notes_cache
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN document_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_study_notes_cache_user_id ON public.study_notes_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_cache_doc ON public.study_notes_cache(document_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_cache_lookup
  ON public.study_notes_cache(user_id, document_id, education_level, content_focus);

-- Keep only one "latest" row per combination by convention; app logic controls this.

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_study_notes_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_study_notes_cache_updated_at ON public.study_notes_cache;
CREATE TRIGGER trigger_update_study_notes_cache_updated_at
  BEFORE UPDATE ON public.study_notes_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_study_notes_cache_updated_at();

-- 3) Enable RLS and basic policies
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_notes_cache ENABLE ROW LEVEL SECURITY;

-- Documents: users can only see and manage their own
CREATE POLICY "Documents: users can view their own"
ON public.documents
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Documents: users can insert their own"
ON public.documents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Documents: users can update their own"
ON public.documents
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Documents: users can delete their own"
ON public.documents
FOR DELETE
USING (auth.uid() = user_id);

-- Study notes cache: users can only see their own cached notes
CREATE POLICY "Study notes: users can view their own"
ON public.study_notes_cache
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Study notes: users can insert their own"
ON public.study_notes_cache
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Study notes: users can update their own"
ON public.study_notes_cache
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Study notes: users can delete their own"
ON public.study_notes_cache
FOR DELETE
USING (auth.uid() = user_id);


