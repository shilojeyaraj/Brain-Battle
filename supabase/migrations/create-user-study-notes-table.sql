-- Create a simple user_study_notes table for storing generated study notes
-- This allows users to access their notes later by ID

CREATE TABLE IF NOT EXISTS public.user_study_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  subject TEXT,
  notes_json JSONB NOT NULL,     -- full notes JSON as returned by /api/notes
  file_names TEXT[],              -- array of file names used to generate notes
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_study_notes_user_id ON public.user_study_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_study_notes_created_at ON public.user_study_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_study_notes_title ON public.user_study_notes(title);

-- Enable RLS
ALTER TABLE public.user_study_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see and manage their own notes
DROP POLICY IF EXISTS "Users can view their own study notes" ON public.user_study_notes;
DROP POLICY IF EXISTS "Users can insert their own study notes" ON public.user_study_notes;
DROP POLICY IF EXISTS "Users can update their own study notes" ON public.user_study_notes;
DROP POLICY IF EXISTS "Users can delete their own study notes" ON public.user_study_notes;

CREATE POLICY "Users can view their own study notes"
ON public.user_study_notes
FOR SELECT
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own study notes"
ON public.user_study_notes
FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own study notes"
ON public.user_study_notes
FOR UPDATE
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own study notes"
ON public.user_study_notes
FOR DELETE
USING (auth.uid()::text = user_id::text);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_user_study_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_study_notes_updated_at ON public.user_study_notes;
CREATE TRIGGER trigger_update_user_study_notes_updated_at
  BEFORE UPDATE ON public.user_study_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_study_notes_updated_at();

-- Add comment
COMMENT ON TABLE public.user_study_notes IS 'Stores AI-generated study notes for users to access later';

