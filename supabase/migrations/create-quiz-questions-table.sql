-- Create quiz_questions table for storing generated quiz questions
-- This table stores questions generated for multiplayer quiz sessions

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,                           -- 0..N-1 sequence within session
  type TEXT CHECK (type IN ('mcq','short','truefalse')) NOT NULL,
  prompt TEXT NOT NULL,
  options TEXT[],                                 -- for MCQ
  answer TEXT NOT NULL,                           -- canonical answer (server trusted)
  meta JSONB DEFAULT '{}'::jsonb,                 -- difficulty, source document, explanation, hints, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index to ensure one question per index per session
CREATE UNIQUE INDEX IF NOT EXISTS quiz_questions_session_idx_unique 
  ON public.quiz_questions(session_id, idx);

-- Create index for faster lookups by session
CREATE INDEX IF NOT EXISTS idx_quiz_questions_session_id 
  ON public.quiz_questions(session_id);

-- Enable RLS
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quiz_questions
-- Users can view questions for sessions they are part of (via room_members)
DROP POLICY IF EXISTS "quiz_questions_select" ON public.quiz_questions;
CREATE POLICY "quiz_questions_select"
ON public.quiz_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_sessions qs
    INNER JOIN public.game_rooms gr ON gr.id = qs.room_id
    INNER JOIN public.room_members rm ON rm.room_id = gr.id
    WHERE qs.id = quiz_questions.session_id
    AND rm.user_id = auth.uid()
  )
  OR (
    -- Allow if session has no room_id (singleplayer)
    EXISTS (
      SELECT 1 FROM public.quiz_sessions qs
      WHERE qs.id = quiz_questions.session_id
      AND qs.room_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.game_results gr
        WHERE gr.session_id = qs.id
        AND gr.user_id = auth.uid()
      )
    )
  )
);

-- Users can insert questions for sessions they are part of (host only, but enforced at application level)
DROP POLICY IF EXISTS "quiz_questions_insert" ON public.quiz_questions;
CREATE POLICY "quiz_questions_insert"
ON public.quiz_questions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quiz_sessions qs
    INNER JOIN public.game_rooms gr ON gr.id = qs.room_id
    INNER JOIN public.room_members rm ON rm.room_id = gr.id
    WHERE qs.id = quiz_questions.session_id
    AND rm.user_id = auth.uid()
  )
  OR (
    -- Allow if session has no room_id (singleplayer)
    EXISTS (
      SELECT 1 FROM public.quiz_sessions qs
      WHERE qs.id = quiz_questions.session_id
      AND qs.room_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.game_results gr
        WHERE gr.session_id = qs.id
        AND gr.user_id = auth.uid()
      )
    )
  )
);

