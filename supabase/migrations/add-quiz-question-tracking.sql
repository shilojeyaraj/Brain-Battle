-- Track quiz questions per document/user to prevent duplicates and enable redo functionality
-- This allows users to retake quizzes with different questions and focus on areas they got wrong

-- 1) Quiz question history table: tracks all questions generated for a document/user
CREATE TABLE IF NOT EXISTS public.quiz_question_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  -- For quizzes without documents (topic-based), store topic hash
  topic_hash TEXT, -- SHA256 hash of (topic + difficulty + educationLevel + contentFocus)
  question_text TEXT NOT NULL, -- The actual question text (for deduplication)
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'open_ended')),
  options JSONB, -- For multiple choice questions
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  source_document TEXT, -- Document name or reference
  session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Index for fast lookup
  CONSTRAINT quiz_question_history_unique UNIQUE (user_id, document_id, question_text)
);

-- Add index for topic-based quizzes (when document_id is NULL)
CREATE INDEX IF NOT EXISTS idx_quiz_question_history_topic 
  ON public.quiz_question_history(user_id, topic_hash) 
  WHERE document_id IS NULL;

-- Add index for document-based quizzes
CREATE INDEX IF NOT EXISTS idx_quiz_question_history_document 
  ON public.quiz_question_history(user_id, document_id) 
  WHERE document_id IS NOT NULL;

-- Add index for session lookup
CREATE INDEX IF NOT EXISTS idx_quiz_question_history_session 
  ON public.quiz_question_history(session_id) 
  WHERE session_id IS NOT NULL;

-- 2) Quiz answer history table: tracks user's answers to track wrong answers for redo
CREATE TABLE IF NOT EXISTS public.quiz_answer_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_history_id UUID NOT NULL REFERENCES public.quiz_question_history(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE SET NULL,
  user_answer TEXT NOT NULL, -- The answer the user provided
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Allow tracking multiple attempts at the same question
  UNIQUE (user_id, question_history_id, session_id)
);

-- Add indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_quiz_answer_history_user 
  ON public.quiz_answer_history(user_id, is_correct);

CREATE INDEX IF NOT EXISTS idx_quiz_answer_history_session 
  ON public.quiz_answer_history(session_id) 
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quiz_answer_history_question 
  ON public.quiz_answer_history(question_history_id);

-- 3) Function to get previous questions for a document/user
CREATE OR REPLACE FUNCTION public.get_previous_questions(
  p_user_id UUID,
  p_document_id UUID DEFAULT NULL,
  p_topic_hash TEXT DEFAULT NULL
)
RETURNS TABLE (
  question_text TEXT,
  question_type TEXT,
  options JSONB,
  correct_answer TEXT
) AS $$
BEGIN
  IF p_document_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      qh.question_text,
      qh.question_type,
      qh.options,
      qh.correct_answer
    FROM public.quiz_question_history qh
    WHERE qh.user_id = p_user_id
      AND qh.document_id = p_document_id
    ORDER BY qh.created_at DESC;
  ELSIF p_topic_hash IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      qh.question_text,
      qh.question_type,
      qh.options,
      qh.correct_answer
    FROM public.quiz_question_history qh
    WHERE qh.user_id = p_user_id
      AND qh.topic_hash = p_topic_hash
    ORDER BY qh.created_at DESC;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 4) Function to get wrong answers for a document/user (for redo focus)
CREATE OR REPLACE FUNCTION public.get_wrong_answers(
  p_user_id UUID,
  p_document_id UUID DEFAULT NULL,
  p_topic_hash TEXT DEFAULT NULL
)
RETURNS TABLE (
  question_text TEXT,
  question_type TEXT,
  options JSONB,
  correct_answer TEXT,
  explanation TEXT,
  source_document TEXT,
  wrong_count BIGINT
) AS $$
BEGIN
  IF p_document_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      qh.question_text,
      qh.question_type,
      qh.options,
      qh.correct_answer,
      qh.explanation,
      qh.source_document,
      COUNT(ah.id) as wrong_count
    FROM public.quiz_question_history qh
    INNER JOIN public.quiz_answer_history ah ON ah.question_history_id = qh.id
    WHERE qh.user_id = p_user_id
      AND qh.document_id = p_document_id
      AND ah.user_id = p_user_id
      AND ah.is_correct = false
    GROUP BY qh.id, qh.question_text, qh.question_type, qh.options, qh.correct_answer, qh.explanation, qh.source_document
    ORDER BY wrong_count DESC, qh.created_at DESC;
  ELSIF p_topic_hash IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      qh.question_text,
      qh.question_type,
      qh.options,
      qh.correct_answer,
      qh.explanation,
      qh.source_document,
      COUNT(ah.id) as wrong_count
    FROM public.quiz_question_history qh
    INNER JOIN public.quiz_answer_history ah ON ah.question_history_id = qh.id
    WHERE qh.user_id = p_user_id
      AND qh.topic_hash = p_topic_hash
      AND ah.user_id = p_user_id
      AND ah.is_correct = false
    GROUP BY qh.id, qh.question_text, qh.question_type, qh.options, qh.correct_answer, qh.explanation, qh.source_document
    ORDER BY wrong_count DESC, qh.created_at DESC;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5) Enable RLS
ALTER TABLE public.quiz_question_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answer_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quiz_question_history
-- Drop existing policies first (safe to run multiple times)
DROP POLICY IF EXISTS "quiz_question_history_select_own" ON public.quiz_question_history;
DROP POLICY IF EXISTS "quiz_question_history_insert_own" ON public.quiz_question_history;
DROP POLICY IF EXISTS "quiz_question_history_update_own" ON public.quiz_question_history;
DROP POLICY IF EXISTS "quiz_question_history_delete_own" ON public.quiz_question_history;

CREATE POLICY "quiz_question_history_select_own"
  ON public.quiz_question_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "quiz_question_history_insert_own"
  ON public.quiz_question_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quiz_question_history_update_own"
  ON public.quiz_question_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quiz_question_history_delete_own"
  ON public.quiz_question_history FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for quiz_answer_history
-- Drop existing policies first (safe to run multiple times)
DROP POLICY IF EXISTS "quiz_answer_history_select_own" ON public.quiz_answer_history;
DROP POLICY IF EXISTS "quiz_answer_history_insert_own" ON public.quiz_answer_history;
DROP POLICY IF EXISTS "quiz_answer_history_update_own" ON public.quiz_answer_history;
DROP POLICY IF EXISTS "quiz_answer_history_delete_own" ON public.quiz_answer_history;

CREATE POLICY "quiz_answer_history_select_own"
  ON public.quiz_answer_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "quiz_answer_history_insert_own"
  ON public.quiz_answer_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quiz_answer_history_update_own"
  ON public.quiz_answer_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quiz_answer_history_delete_own"
  ON public.quiz_answer_history FOR DELETE
  USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE public.quiz_question_history IS 'Tracks all quiz questions generated for a user/document to prevent duplicates';
COMMENT ON TABLE public.quiz_answer_history IS 'Tracks user answers to questions to identify wrong answers for redo functionality';
COMMENT ON FUNCTION public.get_previous_questions IS 'Returns all previous questions for a user/document to exclude from new quiz generation';
COMMENT ON FUNCTION public.get_wrong_answers IS 'Returns questions the user got wrong, ordered by frequency, for redo quiz focus';


