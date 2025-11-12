-- ============================================================================
-- FIX RLS POLICIES FOR SINGLEPLAYER GAMES
-- ============================================================================
-- This script updates RLS policies to allow singleplayer games where room_id is NULL
-- Singleplayer games don't have a room, so we need to allow inserts when room_id IS NULL
-- ============================================================================

-- ============================================================================
-- CREATE HELPER FUNCTIONS (if they don't exist)
-- ============================================================================

-- Check if user is a member of a room
CREATE OR REPLACE FUNCTION public.is_room_member(_room_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = _room_id 
    AND user_id = auth.uid()
  );
$$;

-- ============================================================================
-- QUIZ_SESSIONS TABLE - Allow singleplayer sessions (room_id IS NULL)
-- ============================================================================

-- Drop existing insert policy
DROP POLICY IF EXISTS "quiz_sessions_insert" ON public.quiz_sessions;

-- Create new insert policy that allows singleplayer (room_id IS NULL) or multiplayer (room exists)
CREATE POLICY "quiz_sessions_insert"
ON public.quiz_sessions
FOR INSERT
WITH CHECK (
  -- Allow singleplayer games (room_id IS NULL)
  room_id IS NULL
  OR public.is_room_member(room_id)
  OR EXISTS (
    SELECT 1 FROM public.game_rooms gr
    WHERE gr.id = quiz_sessions.room_id
    AND EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = gr.id
      AND rm.user_id = auth.uid()
    )
  )
);

-- Update select policy to allow viewing own singleplayer sessions
DROP POLICY IF EXISTS "quiz_sessions_select" ON public.quiz_sessions;

CREATE POLICY "quiz_sessions_select"
ON public.quiz_sessions
FOR SELECT
USING (
  -- Allow viewing singleplayer sessions (room_id IS NULL) - users can see their own
  -- We'll verify ownership via game_results or player_answers
  (room_id IS NULL AND (
    EXISTS (
      SELECT 1 FROM public.game_results gr
      WHERE gr.session_id = quiz_sessions.id
      AND gr.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.player_answers pa
      WHERE pa.question_id IN (
        SELECT id FROM public.questions WHERE session_id = quiz_sessions.id
      )
      AND pa.user_id = auth.uid()
    )
  ))
  OR public.is_room_member(room_id)
  OR EXISTS (
    SELECT 1 FROM public.game_rooms gr
    WHERE gr.id = quiz_sessions.room_id
    AND EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = gr.id
      AND rm.user_id = auth.uid()
    )
  )
);

-- ============================================================================
-- QUESTIONS TABLE - Allow questions for singleplayer sessions
-- ============================================================================

-- Drop existing insert policy
DROP POLICY IF EXISTS "questions_insert" ON public.questions;

-- Create new insert policy that allows questions for singleplayer sessions
CREATE POLICY "questions_insert"
ON public.questions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quiz_sessions qs
    WHERE qs.id = questions.session_id
    AND (
      -- Allow if session is singleplayer (room_id IS NULL)
      -- For singleplayer, we allow any authenticated user to insert questions
      -- The session will be linked to the user via game_results later
      qs.room_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.game_rooms gr
        WHERE gr.id = qs.room_id
        AND EXISTS (
          SELECT 1 FROM public.room_members rm
          WHERE rm.room_id = gr.id
          AND rm.user_id = auth.uid()
        )
      )
    )
  )
);

-- Update select policy
DROP POLICY IF EXISTS "questions_select" ON public.questions;

CREATE POLICY "questions_select"
ON public.questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_sessions qs
    WHERE qs.id = questions.session_id
    AND (
      -- Allow viewing questions for singleplayer sessions
      -- Users can see questions if they have answers or results for that session
      (qs.room_id IS NULL AND (
        EXISTS (
          SELECT 1 FROM public.game_results gr
          WHERE gr.session_id = qs.id
          AND gr.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.player_answers pa
          WHERE pa.question_id = questions.id
          AND pa.user_id = auth.uid()
        )
      ))
      OR EXISTS (
        SELECT 1 FROM public.game_rooms gr
        WHERE gr.id = qs.room_id
        AND EXISTS (
          SELECT 1 FROM public.room_members rm
          WHERE rm.room_id = gr.id
          AND rm.user_id = auth.uid()
        )
      )
    )
  )
);

-- ============================================================================
-- PLAYER_ANSWERS TABLE - Allow answers for singleplayer games
-- ============================================================================

-- Drop existing insert policy
DROP POLICY IF EXISTS "player_answers_insert" ON public.player_answers;

-- Create new insert policy that allows singleplayer answers (room_id IS NULL)
CREATE POLICY "player_answers_insert"
ON public.player_answers
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    -- Allow singleplayer answers (room_id IS NULL)
    room_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.game_rooms gr
      WHERE gr.id = player_answers.room_id
      AND EXISTS (
        SELECT 1 FROM public.room_members rm
        WHERE rm.room_id = gr.id
        AND rm.user_id = auth.uid()
      )
    )
  )
);

-- Update select policy
DROP POLICY IF EXISTS "player_answers_select" ON public.player_answers;

CREATE POLICY "player_answers_select"
ON public.player_answers
FOR SELECT
USING (
  user_id = auth.uid()
  OR (
    -- Allow viewing own singleplayer answers
    room_id IS NULL
    AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.game_rooms gr
    WHERE gr.id = player_answers.room_id
    AND EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = gr.id
      AND rm.user_id = auth.uid()
    )
  )
);

-- ============================================================================
-- GAME_RESULTS TABLE - Allow inserting game results (currently blocked!)
-- ============================================================================

-- The comment says "API uses service role" but it's actually using anon key
-- So we need to add an INSERT policy

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "game_results_insert" ON public.game_results;

-- Create new insert policy that allows singleplayer results
CREATE POLICY "game_results_insert"
ON public.game_results
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    -- Allow singleplayer results (room_id IS NULL)
    room_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.game_rooms gr
      WHERE gr.id = game_results.room_id
      AND EXISTS (
        SELECT 1 FROM public.room_members rm
        WHERE rm.room_id = gr.id
        AND rm.user_id = auth.uid()
      )
    )
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('quiz_sessions', 'questions', 'player_answers', 'game_results')
ORDER BY tablename, policyname;

