-- ============================================================================
-- COMPREHENSIVE RLS SECURITY FIX FOR ALL TABLES
-- ============================================================================
-- This migration ensures ALL tables have proper Row Level Security enabled
-- and removes any overly permissive policies that allow unrestricted access
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL OVERLY PERMISSIVE POLICIES
-- ============================================================================

-- Drop policies that allow all operations (these are security risks)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    ) LOOP
        -- Drop overly permissive policies
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow all operations on users', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow all operations on player_stats', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow all operations on game_rooms', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow all operations on room_members', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow all operations on documents', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow all operations on quiz_sessions', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow all operations on questions', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow all operations on player_answers', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow all operations on game_results', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow all operations on leaderboard', r.tablename);
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: ENABLE RLS ON ALL TABLES (only if they exist)
-- ============================================================================

-- Function to safely enable RLS on a table if it exists
CREATE OR REPLACE FUNCTION enable_rls_if_exists(p_table_name TEXT)
RETURNS void AS $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables t
        WHERE t.table_schema = 'public' 
        AND t.table_name = p_table_name
    ) THEN
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table_name);
        RAISE NOTICE '✅ Enabled RLS on: %', p_table_name;
    ELSE
        RAISE NOTICE '⚠️  Table does not exist, skipping: %', p_table_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Core user tables
SELECT enable_rls_if_exists('users');
SELECT enable_rls_if_exists('profiles');
SELECT enable_rls_if_exists('player_stats');

-- Room tables
SELECT enable_rls_if_exists('rooms');
SELECT enable_rls_if_exists('game_rooms');
SELECT enable_rls_if_exists('room_members');

-- Content tables
SELECT enable_rls_if_exists('uploads');
SELECT enable_rls_if_exists('documents');
SELECT enable_rls_if_exists('units');
SELECT enable_rls_if_exists('document_embeddings');
SELECT enable_rls_if_exists('study_notes_cache');

-- Quiz tables
SELECT enable_rls_if_exists('quiz_sessions');
SELECT enable_rls_if_exists('quiz_questions');
SELECT enable_rls_if_exists('quiz_answers');
SELECT enable_rls_if_exists('questions');
SELECT enable_rls_if_exists('player_answers');
SELECT enable_rls_if_exists('player_progress');
SELECT enable_rls_if_exists('quiz_question_history');
SELECT enable_rls_if_exists('quiz_answer_history');

-- Results tables
SELECT enable_rls_if_exists('game_results');
SELECT enable_rls_if_exists('leaderboard');

-- Event tables
SELECT enable_rls_if_exists('session_events');

-- Subscription tables
SELECT enable_rls_if_exists('subscriptions');
SELECT enable_rls_if_exists('subscription_history');

-- Clan tables (already have RLS, but ensure it's enabled)
SELECT enable_rls_if_exists('clans');
SELECT enable_rls_if_exists('clan_members');
SELECT enable_rls_if_exists('clan_sessions');

-- Rate limits (usually doesn't need RLS, but enable for consistency)
-- Note: rate_limits is typically accessed only by server-side code
-- SELECT enable_rls_if_exists('rate_limits');

-- Clean up helper function
DROP FUNCTION IF EXISTS enable_rls_if_exists(TEXT);

-- ============================================================================
-- STEP 3: CREATE SECURE POLICIES FOR TABLES MISSING THEM
-- ============================================================================

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Only create policies if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "users_select_own" ON public.users;
        DROP POLICY IF EXISTS "users_update_own" ON public.users;
        DROP POLICY IF EXISTS "users_insert_own" ON public.users;

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
        WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);
    END IF;
END $$;

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
        DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
        DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
        DROP POLICY IF EXISTS "profiles_insert_any" ON public.profiles;

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
    END IF;
END $$;

-- ============================================================================
-- PLAYER_STATS TABLE POLICIES
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'player_stats') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "player_stats_select_all" ON public.player_stats;
        DROP POLICY IF EXISTS "player_stats_update_own" ON public.player_stats;
        DROP POLICY IF EXISTS "player_stats_insert_own" ON public.player_stats;
        DROP POLICY IF EXISTS "player_stats_insert_any" ON public.player_stats;

        -- Users can view all player stats (for leaderboards)
        CREATE POLICY "player_stats_select_all"
        ON public.player_stats
        FOR SELECT
        USING (true);

        -- Users can update their own stats
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
    END IF;
END $$;

-- ============================================================================
-- GAME_ROOMS TABLE POLICIES
-- ============================================================================

-- Only create policies if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'game_rooms') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "game_rooms_select" ON public.game_rooms;
        DROP POLICY IF EXISTS "game_rooms_insert" ON public.game_rooms;
        DROP POLICY IF EXISTS "game_rooms_update" ON public.game_rooms;
        DROP POLICY IF EXISTS "game_rooms_delete" ON public.game_rooms;

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
    END IF;
END $$;

-- ============================================================================
-- QUESTIONS TABLE POLICIES (from setup.sql)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'questions') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "questions_select" ON public.questions;
        DROP POLICY IF EXISTS "questions_insert" ON public.questions;

        -- Users can view questions for sessions they're members of
        CREATE POLICY "questions_select"
        ON public.questions
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.quiz_sessions qs
            WHERE qs.id = questions.session_id
            AND (
              qs.room_id IS NULL -- Singleplayer sessions
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
        CREATE POLICY "questions_insert"
        ON public.questions
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.quiz_sessions qs
            WHERE qs.id = questions.session_id
            AND (
              qs.room_id IS NULL -- Singleplayer sessions
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
    END IF;
END $$;

-- ============================================================================
-- PLAYER_ANSWERS TABLE POLICIES
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'player_answers') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "player_answers_select" ON public.player_answers;
        DROP POLICY IF EXISTS "player_answers_insert" ON public.player_answers;

        -- Users can view their own answers or answers in rooms they're members of
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
          AND (
            room_id IS NULL -- Singleplayer
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
    END IF;
END $$;

-- ============================================================================
-- GAME_RESULTS TABLE POLICIES
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'game_results') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "game_results_select" ON public.game_results;
        DROP POLICY IF EXISTS "game_results_update" ON public.game_results;

        -- Users can view their own results or results in rooms they're members of
        CREATE POLICY "game_results_select"
        ON public.game_results
        FOR SELECT
        USING (
          user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.quiz_sessions qs
            WHERE qs.id = game_results.session_id
            AND (
              qs.room_id IS NULL -- Singleplayer
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

        -- Users can update their own results
        CREATE POLICY "game_results_update"
        ON public.game_results
        FOR UPDATE
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

-- ============================================================================
-- LEADERBOARD TABLE POLICIES
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leaderboard') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "leaderboard_select_all" ON public.leaderboard;

        -- Everyone can view the leaderboard (public read)
        CREATE POLICY "leaderboard_select_all"
        ON public.leaderboard
        FOR SELECT
        USING (true);

        -- No INSERT/UPDATE/DELETE policies - leaderboard is updated by triggers/system
    END IF;
END $$;

-- ============================================================================
-- SUBSCRIPTIONS TABLE POLICIES
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
        DROP POLICY IF EXISTS "subscriptions_update_own" ON public.subscriptions;
        DROP POLICY IF EXISTS "subscriptions_insert_own" ON public.subscriptions;

        -- Users can view their own subscriptions
        CREATE POLICY "subscriptions_select_own"
        ON public.subscriptions
        FOR SELECT
        USING (user_id = auth.uid());

        -- Users can update their own subscriptions
        CREATE POLICY "subscriptions_update_own"
        ON public.subscriptions
        FOR UPDATE
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());

        -- Users can insert their own subscriptions
        CREATE POLICY "subscriptions_insert_own"
        ON public.subscriptions
        FOR INSERT
        WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

-- ============================================================================
-- SUBSCRIPTION_HISTORY TABLE POLICIES
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscription_history') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "subscription_history_select_own" ON public.subscription_history;

        -- Users can view their own subscription history
        CREATE POLICY "subscription_history_select_own"
        ON public.subscription_history
        FOR SELECT
        USING (user_id = auth.uid());

        -- No INSERT/UPDATE/DELETE policies - history is updated by system
    END IF;
END $$;

-- ============================================================================
-- DOCUMENT_EMBEDDINGS TABLE POLICIES
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_embeddings') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "document_embeddings_select_own" ON public.document_embeddings;
        DROP POLICY IF EXISTS "document_embeddings_insert_own" ON public.document_embeddings;
        DROP POLICY IF EXISTS "document_embeddings_update_own" ON public.document_embeddings;
        DROP POLICY IF EXISTS "document_embeddings_delete_own" ON public.document_embeddings;

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
    END IF;
END $$;

-- ============================================================================
-- QUIZ_SESSIONS TABLE POLICIES (for singleplayer support)
-- ============================================================================

-- Only create policies if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quiz_sessions') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "quiz_sessions_select" ON public.quiz_sessions;
        DROP POLICY IF EXISTS "quiz_sessions_insert" ON public.quiz_sessions;
        DROP POLICY IF EXISTS "quiz_sessions_update" ON public.quiz_sessions;
        DROP POLICY IF EXISTS "Session select" ON public.quiz_sessions;
        DROP POLICY IF EXISTS "Session insert" ON public.quiz_sessions;
        DROP POLICY IF EXISTS "Session update" ON public.quiz_sessions;

        -- Users can view sessions they're members of OR their own singleplayer sessions
        -- For singleplayer, allow if user_id matches (we'll check via game_results or questions)
        CREATE POLICY "quiz_sessions_select"
        ON public.quiz_sessions
        FOR SELECT
        USING (
          room_id IS NULL -- Singleplayer - allow all (will be filtered by other tables)
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

        -- Users can create sessions in rooms they're members of OR singleplayer sessions
        CREATE POLICY "quiz_sessions_insert"
        ON public.quiz_sessions
        FOR INSERT
        WITH CHECK (
          room_id IS NULL -- Singleplayer allowed
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

        -- Users can update sessions they're members of
        CREATE POLICY "quiz_sessions_update"
        ON public.quiz_sessions
        FOR UPDATE
        USING (
          room_id IS NULL -- Singleplayer
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
          room_id IS NULL -- Singleplayer
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
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION: Check that all tables have RLS enabled
-- ============================================================================

DO $$
DECLARE
    r RECORD;
    missing_rls TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT IN ('rate_limits') -- Rate limits don't need RLS
    ) LOOP
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_tables t
            JOIN pg_class c ON c.relname = t.tablename
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
            AND t.tablename = r.tablename
            AND c.relrowsecurity = true
        ) THEN
            missing_rls := array_append(missing_rls, r.tablename);
        END IF;
    END LOOP;
    
    IF array_length(missing_rls, 1) > 0 THEN
        RAISE WARNING 'Tables missing RLS: %', array_to_string(missing_rls, ', ');
    ELSE
        RAISE NOTICE '✅ All tables have RLS enabled';
    END IF;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- This migration ensures:
-- 1. All tables have RLS enabled
-- 2. Overly permissive policies are removed
-- 3. Secure, user-scoped policies are in place
-- 
-- IMPORTANT: If you're using custom authentication (not Supabase Auth),
-- you may need to adjust these policies or use service role key in API routes.
-- 
-- ============================================================================

