-- ============================================
-- PRODUCTION RLS POLICIES FOR BRAIN BATTLE
-- ============================================
-- 
-- This file contains comprehensive Row Level Security (RLS) policies
-- for all tables in the Brain Battle application.
--
-- IMPORTANT: These policies assume Supabase Auth is being used for
-- session management. If using custom auth, API routes should use
-- service role key and handle authorization in application code.
--
-- Run this script AFTER creating all tables.
-- ============================================

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

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

-- Check if user is the owner/host of a room
CREATE OR REPLACE FUNCTION public.is_room_owner(_room_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rooms
    WHERE id = _room_id 
    AND owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.game_rooms
    WHERE id = _room_id 
    AND host_id = auth.uid()
  );
$$;

-- Check if user is a member of a session (via room)
CREATE OR REPLACE FUNCTION public.is_session_member(_session_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quiz_sessions qs
    JOIN public.rooms r ON r.id = qs.room_id
    JOIN public.room_members rm ON rm.room_id = r.id
    WHERE qs.id = _session_id 
    AND rm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.quiz_sessions qs
    JOIN public.game_rooms gr ON gr.id = qs.room_id
    JOIN public.room_members rm ON rm.room_id = gr.id
    WHERE qs.id = _session_id 
    AND rm.user_id = auth.uid()
  );
$$;

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

-- Core user tables
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.player_stats ENABLE ROW LEVEL SECURITY;

-- Room tables
ALTER TABLE IF EXISTS public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.room_members ENABLE ROW LEVEL SECURITY;

-- Content tables
ALTER TABLE IF EXISTS public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.document_embeddings ENABLE ROW LEVEL SECURITY;

-- Quiz tables
ALTER TABLE IF EXISTS public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.player_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.player_progress ENABLE ROW LEVEL SECURITY;

-- Results tables
ALTER TABLE IF EXISTS public.game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Event tables
ALTER TABLE IF EXISTS public.session_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP EXISTING POLICIES (if any)
-- ============================================

-- Drop all existing policies to start fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "Users can view all profiles" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Users can update own profile" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Users can insert own profile" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Room select" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Room insert" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Room update" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Member select" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Member insert" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Member delete" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Upload select" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Upload insert" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Upload update" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Unit select" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Unit insert" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Unit update" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Session select" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Session insert" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Session update" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Question select" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Question insert" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Answer select" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Answer insert" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Progress select" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Progress upsert" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Event select" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Event insert" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Allow all operations on users" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Allow all operations on player_stats" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Allow all operations on game_rooms" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Allow all operations on room_members" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Allow all operations on documents" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Allow all operations on quiz_sessions" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Allow all operations on questions" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Allow all operations on player_answers" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Allow all operations on game_results" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Allow all operations on leaderboard" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Users can view their own data" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Users can update their own data" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Users can view their own stats" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Users can view public game rooms" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Users can create game rooms" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Users can view rooms they\'re members of" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Users can join rooms" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Users can view their own document embeddings" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Users can insert their own document embeddings" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Users can update their own document embeddings" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Users can delete their own document embeddings" ON public.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Users can view their own user record
CREATE POLICY "users_select_own"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- Users can update their own user record
CREATE POLICY "users_update_own"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Users can insert their own user record (during registration)
CREATE POLICY "users_insert_own"
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id OR auth.uid() IS NULL); -- Allow during registration

-- Users cannot delete their own account (handled by application logic)
-- No DELETE policy = users cannot delete via RLS

-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================

-- Users can view all profiles (for leaderboards, etc.)
CREATE POLICY "profiles_select_all"
ON public.profiles
FOR SELECT
USING (true);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ============================================
-- PLAYER_STATS TABLE POLICIES
-- ============================================

-- Users can view all player stats (for leaderboards)
CREATE POLICY "player_stats_select_all"
ON public.player_stats
FOR SELECT
USING (true);

-- Users can update their own stats (via triggers/app logic)
CREATE POLICY "player_stats_update_own"
ON public.player_stats
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can insert their own stats (initial creation)
CREATE POLICY "player_stats_insert_own"
ON public.player_stats
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ============================================
-- ROOMS TABLE POLICIES (from schema.sql)
-- ============================================

-- Users can view rooms they're members of
CREATE POLICY "rooms_select_members"
ON public.rooms
FOR SELECT
USING (public.is_room_member(id));

-- Users can create rooms (they become the owner)
CREATE POLICY "rooms_insert_owner"
ON public.rooms
FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- Only room owners can update their rooms
CREATE POLICY "rooms_update_owner"
ON public.rooms
FOR UPDATE
USING (public.is_room_owner(id))
WITH CHECK (public.is_room_owner(id));

-- Only room owners can delete their rooms
CREATE POLICY "rooms_delete_owner"
ON public.rooms
FOR DELETE
USING (public.is_room_owner(id));

-- ============================================
-- GAME_ROOMS TABLE POLICIES (from setup.sql)
-- ============================================

-- Users can view public rooms or rooms they're members of
CREATE POLICY "game_rooms_select"
ON public.game_rooms
FOR SELECT
USING (
  NOT is_private 
  OR host_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = game_rooms.id
    AND user_id = auth.uid()
  )
);

-- Users can create game rooms (they become the host)
CREATE POLICY "game_rooms_insert"
ON public.game_rooms
FOR INSERT
WITH CHECK (host_id = auth.uid());

-- Only room hosts can update their rooms
CREATE POLICY "game_rooms_update"
ON public.game_rooms
FOR UPDATE
USING (host_id = auth.uid())
WITH CHECK (host_id = auth.uid());

-- Only room hosts can delete their rooms
CREATE POLICY "game_rooms_delete"
ON public.game_rooms
FOR DELETE
USING (host_id = auth.uid());

-- ============================================
-- ROOM_MEMBERS TABLE POLICIES
-- ============================================

-- Users can view members of rooms they're in
CREATE POLICY "room_members_select"
ON public.room_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.rooms
    WHERE id = room_members.room_id
    AND public.is_room_member(room_members.room_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.game_rooms
    WHERE id = room_members.room_id
    AND EXISTS (
      SELECT 1 FROM public.room_members rm2
      WHERE rm2.room_id = room_members.room_id
      AND rm2.user_id = auth.uid()
    )
  )
);

-- Users can join rooms (add themselves)
CREATE POLICY "room_members_insert"
ON public.room_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.rooms
    WHERE id = room_members.room_id
    AND owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.game_rooms
    WHERE id = room_members.room_id
    AND host_id = auth.uid()
  )
);

-- Users can leave rooms (remove themselves) or owners can remove members
CREATE POLICY "room_members_delete"
ON public.room_members
FOR DELETE
USING (
  user_id = auth.uid()
  OR public.is_room_owner(room_id)
);

-- ============================================
-- UPLOADS TABLE POLICIES
-- ============================================

-- Users can view uploads in rooms they're members of
CREATE POLICY "uploads_select"
ON public.uploads
FOR SELECT
USING (
  public.is_room_member(room_id)
  OR EXISTS (
    SELECT 1 FROM public.game_rooms gr
    WHERE gr.id = uploads.room_id
    AND EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = gr.id
      AND rm.user_id = auth.uid()
    )
  )
);

-- Users can upload files to rooms they're members of
CREATE POLICY "uploads_insert"
ON public.uploads
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    public.is_room_member(room_id)
    OR EXISTS (
      SELECT 1 FROM public.game_rooms gr
      WHERE gr.id = uploads.room_id
      AND EXISTS (
        SELECT 1 FROM public.room_members rm
        WHERE rm.room_id = gr.id
        AND rm.user_id = auth.uid()
      )
    )
  )
);

-- Users can update their own uploads in rooms they're members of
CREATE POLICY "uploads_update"
ON public.uploads
FOR UPDATE
USING (
  user_id = auth.uid()
  AND (
    public.is_room_member(room_id)
    OR EXISTS (
      SELECT 1 FROM public.game_rooms gr
      WHERE gr.id = uploads.room_id
      AND EXISTS (
        SELECT 1 FROM public.room_members rm
        WHERE rm.room_id = gr.id
        AND rm.user_id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND (
    public.is_room_member(room_id)
    OR EXISTS (
      SELECT 1 FROM public.game_rooms gr
      WHERE gr.id = uploads.room_id
      AND EXISTS (
        SELECT 1 FROM public.room_members rm
        WHERE rm.room_id = gr.id
        AND rm.user_id = auth.uid()
      )
    )
  )
);

-- Users can delete their own uploads
CREATE POLICY "uploads_delete"
ON public.uploads
FOR DELETE
USING (user_id = auth.uid());

-- ============================================
-- DOCUMENTS TABLE POLICIES (from setup.sql)
-- ============================================

-- Users can view documents in rooms they're members of
CREATE POLICY "documents_select"
ON public.documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.game_rooms gr
    WHERE gr.id = documents.room_id
    AND (
      NOT gr.is_private
      OR gr.host_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.room_members rm
        WHERE rm.room_id = gr.id
        AND rm.user_id = auth.uid()
      )
    )
  )
);

-- Users can upload documents to rooms they're members of
CREATE POLICY "documents_insert"
ON public.documents
FOR INSERT
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.game_rooms gr
    WHERE gr.id = documents.room_id
    AND EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = gr.id
      AND rm.user_id = auth.uid()
    )
  )
);

-- Users can update their own documents
CREATE POLICY "documents_update"
ON public.documents
FOR UPDATE
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

-- Users can delete their own documents
CREATE POLICY "documents_delete"
ON public.documents
FOR DELETE
USING (uploaded_by = auth.uid());

-- ============================================
-- UNITS TABLE POLICIES
-- ============================================

-- Users can view units in rooms they're members of
CREATE POLICY "units_select"
ON public.units
FOR SELECT
USING (
  public.is_room_member(room_id)
  OR EXISTS (
    SELECT 1 FROM public.game_rooms gr
    WHERE gr.id = units.room_id
    AND EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = gr.id
      AND rm.user_id = auth.uid()
    )
  )
);

-- Users can create units in rooms they're members of
CREATE POLICY "units_insert"
ON public.units
FOR INSERT
WITH CHECK (
  public.is_room_member(room_id)
  OR EXISTS (
    SELECT 1 FROM public.game_rooms gr
    WHERE gr.id = units.room_id
    AND EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = gr.id
      AND rm.user_id = auth.uid()
    )
  )
);

-- Users can update units in rooms they're members of
CREATE POLICY "units_update"
ON public.units
FOR UPDATE
USING (
  public.is_room_member(room_id)
  OR EXISTS (
    SELECT 1 FROM public.game_rooms gr
    WHERE gr.id = units.room_id
    AND EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = gr.id
      AND rm.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  public.is_room_member(room_id)
  OR EXISTS (
    SELECT 1 FROM public.game_rooms gr
    WHERE gr.id = units.room_id
    AND EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = gr.id
      AND rm.user_id = auth.uid()
    )
  )
);

-- ============================================
-- QUIZ_SESSIONS TABLE POLICIES
-- ============================================

-- Users can view sessions in rooms they're members of
CREATE POLICY "quiz_sessions_select"
ON public.quiz_sessions
FOR SELECT
USING (
  public.is_room_member(room_id)
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

-- Users can create sessions in rooms they're members of
CREATE POLICY "quiz_sessions_insert"
ON public.quiz_sessions
FOR INSERT
WITH CHECK (
  public.is_room_member(room_id)
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

-- Users can update sessions in rooms they're members of
CREATE POLICY "quiz_sessions_update"
ON public.quiz_sessions
FOR UPDATE
USING (
  public.is_room_member(room_id)
  OR EXISTS (
    SELECT 1 FROM public.game_rooms gr
    WHERE gr.id = quiz_sessions.room_id
    AND EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = gr.id
      AND rm.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  public.is_room_member(room_id)
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

-- ============================================
-- QUIZ_QUESTIONS TABLE POLICIES
-- ============================================

-- Users can view questions for sessions they're members of
CREATE POLICY "quiz_questions_select"
ON public.quiz_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_sessions qs
    WHERE qs.id = quiz_questions.session_id
    AND (
      public.is_room_member(qs.room_id)
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

-- Users can insert questions for sessions they're members of
CREATE POLICY "quiz_questions_insert"
ON public.quiz_questions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quiz_sessions qs
    WHERE qs.id = quiz_questions.session_id
    AND (
      public.is_room_member(qs.room_id)
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

-- ============================================
-- QUESTIONS TABLE POLICIES (from setup.sql)
-- ============================================

-- Users can view questions for sessions they're members of
CREATE POLICY "questions_select"
ON public.questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_sessions qs
    WHERE qs.id = questions.session_id
    AND EXISTS (
      SELECT 1 FROM public.game_rooms gr
      WHERE gr.id = qs.room_id
      AND EXISTS (
        SELECT 1 FROM public.room_members rm
        WHERE rm.room_id = gr.id
        AND rm.user_id = auth.uid()
      )
    )
  )
);

-- Users can insert questions for sessions they're members of
CREATE POLICY "questions_insert"
ON public.questions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quiz_sessions qs
    WHERE qs.id = questions.session_id
    AND EXISTS (
      SELECT 1 FROM public.game_rooms gr
      WHERE gr.id = qs.room_id
      AND EXISTS (
        SELECT 1 FROM public.room_members rm
        WHERE rm.room_id = gr.id
        AND rm.user_id = auth.uid()
      )
    )
  )
);

-- ============================================
-- QUIZ_ANSWERS TABLE POLICIES
-- ============================================

-- Users can view answers for sessions they're members of
CREATE POLICY "quiz_answers_select"
ON public.quiz_answers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_sessions qs
    WHERE qs.id = quiz_answers.session_id
    AND (
      public.is_room_member(qs.room_id)
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

-- Users can only submit their own answers
CREATE POLICY "quiz_answers_insert"
ON public.quiz_answers
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.quiz_sessions qs
    WHERE qs.id = quiz_answers.session_id
    AND (
      public.is_room_member(qs.room_id)
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

-- ============================================
-- PLAYER_ANSWERS TABLE POLICIES (from setup.sql)
-- ============================================

-- Users can view answers for sessions they're members of
CREATE POLICY "player_answers_select"
ON public.player_answers
FOR SELECT
USING (
  user_id = auth.uid()
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

-- Users can only submit their own answers
CREATE POLICY "player_answers_insert"
ON public.player_answers
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.game_rooms gr
    WHERE gr.id = player_answers.room_id
    AND EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = gr.id
      AND rm.user_id = auth.uid()
    )
  )
);

-- ============================================
-- PLAYER_PROGRESS TABLE POLICIES
-- ============================================

-- Users can view progress for sessions they're members of
CREATE POLICY "player_progress_select"
ON public.player_progress
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_sessions qs
    WHERE qs.id = player_progress.session_id
    AND (
      public.is_room_member(qs.room_id)
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

-- Users can update their own progress
CREATE POLICY "player_progress_upsert"
ON public.player_progress
FOR ALL
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.quiz_sessions qs
    WHERE qs.id = player_progress.session_id
    AND (
      public.is_room_member(qs.room_id)
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
)
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.quiz_sessions qs
    WHERE qs.id = player_progress.session_id
    AND (
      public.is_room_member(qs.room_id)
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

-- ============================================
-- GAME_RESULTS TABLE POLICIES
-- ============================================

-- Users can view results for sessions they participated in
CREATE POLICY "game_results_select"
ON public.game_results
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.quiz_sessions qs
    WHERE qs.id = game_results.session_id
    AND (
      public.is_room_member(qs.room_id)
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

-- Only system can insert game results (via API with service role)
-- Users cannot directly insert results
-- No INSERT policy = users cannot insert via RLS (API uses service role)

-- Users can update their own results (if needed)
CREATE POLICY "game_results_update"
ON public.game_results
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- LEADERBOARD TABLE POLICIES
-- ============================================

-- Everyone can view the leaderboard (public read)
CREATE POLICY "leaderboard_select_all"
ON public.leaderboard
FOR SELECT
USING (true);

-- Only system can update leaderboard (via triggers/API with service role)
-- No INSERT/UPDATE/DELETE policies = users cannot modify via RLS

-- ============================================
-- SESSION_EVENTS TABLE POLICIES
-- ============================================

-- Users can view events for sessions they're members of
CREATE POLICY "session_events_select"
ON public.session_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_sessions qs
    WHERE qs.id = session_events.session_id
    AND (
      public.is_room_member(qs.room_id)
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

-- Users can insert events for sessions they're members of
CREATE POLICY "session_events_insert"
ON public.session_events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quiz_sessions qs
    WHERE qs.id = session_events.session_id
    AND (
      public.is_room_member(qs.room_id)
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

-- ============================================
-- DOCUMENT_EMBEDDINGS TABLE POLICIES
-- ============================================

-- Users can view their own document embeddings
CREATE POLICY "document_embeddings_select_own"
ON public.document_embeddings
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own document embeddings
CREATE POLICY "document_embeddings_insert_own"
ON public.document_embeddings
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own document embeddings
CREATE POLICY "document_embeddings_update_own"
ON public.document_embeddings
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own document embeddings
CREATE POLICY "document_embeddings_delete_own"
ON public.document_embeddings
FOR DELETE
USING (user_id = auth.uid());

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant necessary permissions to authenticated and anonymous users
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION public.is_room_member(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_owner(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_session_member(UUID) TO anon, authenticated;

-- ============================================
-- NOTES FOR PRODUCTION
-- ============================================
--
-- IMPORTANT CONSIDERATIONS:
--
-- 1. CUSTOM AUTHENTICATION:
--    - These policies assume Supabase Auth (auth.uid())
--    - If using custom auth, API routes should use service role key
--    - Service role key bypasses RLS, so handle authorization in code
--
-- 2. TESTING:
--    - Test all policies with different user roles
--    - Verify users can only access their own data
--    - Verify room members can access room data
--    - Verify non-members cannot access private room data
--
-- 3. PERFORMANCE:
--    - Helper functions use SECURITY DEFINER for performance
--    - Indexes on foreign keys improve policy performance
--    - Consider adding indexes on user_id columns if missing
--
-- 4. SECURITY:
--    - Never use service role key in client-side code
--    - Always validate user permissions in API routes
--    - RLS is a defense-in-depth layer, not the only security measure
--
-- 5. MONITORING:
--    - Monitor RLS policy violations
--    - Check Supabase logs for policy errors
--    - Test policies after schema changes
--
-- ============================================


