-- Migration: Add Memory Architecture Tables
-- 
-- This migration creates tables for the AI Agent Memory Architecture system.
-- These tables are completely separate from existing notes storage and do NOT
-- modify any existing tables. All features are behind feature flags and can be
-- disabled without affecting core functionality.
--
-- Created: 2025-01-XX
-- Purpose: Enable progress tracking, pattern memory, and feature backlog
--          for improving AI agent performance over time

-- ============================================================================
-- 1. GENERATION PROGRESS LOG
-- ============================================================================
-- Tracks what happened during each quiz/notes generation session.
-- Used to identify patterns, learn from failures, and measure improvements.

CREATE TABLE IF NOT EXISTS public.generation_progress_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('quiz_generation', 'study_notes')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID,
  document_types TEXT[],
  features_worked_on TEXT[],
  key_learnings TEXT[],
  errors_encountered TEXT[],
  tokens_used INTEGER DEFAULT 0,
  processing_time_ms INTEGER DEFAULT 0,
  notes_quality_metrics JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_progress_log_user_id ON public.generation_progress_log(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_log_task_type ON public.generation_progress_log(task_type);
CREATE INDEX IF NOT EXISTS idx_progress_log_timestamp ON public.generation_progress_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_progress_log_session_id ON public.generation_progress_log(session_id);

-- Comments for documentation
COMMENT ON TABLE public.generation_progress_log IS 'Tracks progress and outcomes of each AI generation session for learning and improvement';
COMMENT ON COLUMN public.generation_progress_log.session_id IS 'Unique identifier for this generation session';
COMMENT ON COLUMN public.generation_progress_log.notes_quality_metrics IS 'JSON object with quality metrics like formulas_extracted, page_refs_present, etc.';

-- ============================================================================
-- 2. FEATURE BACKLOG
-- ============================================================================
-- Machine-readable list of features/capabilities that need improvement.
-- Each feature has pass/fail criteria and test functions.
-- This is the "domain memory" - what the agent remembers across sessions.

CREATE TABLE IF NOT EXISTS public.feature_backlog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('passing', 'failing', 'untested')) DEFAULT 'untested',
  criteria TEXT[],
  test_functions TEXT[],
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempts INTEGER DEFAULT 0,
  learnings TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_backlog_status ON public.feature_backlog(status);
CREATE INDEX IF NOT EXISTS idx_feature_backlog_feature_id ON public.feature_backlog(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_backlog_last_updated ON public.feature_backlog(last_updated DESC);

-- Comments
COMMENT ON TABLE public.feature_backlog IS 'Machine-readable feature list with pass/fail criteria. This is the "domain memory" that persists across sessions';
COMMENT ON COLUMN public.feature_backlog.feature_id IS 'Unique identifier like "formula_extraction", "page_references", etc.';
COMMENT ON COLUMN public.feature_backlog.status IS 'passing = tests pass, failing = needs work, untested = not yet validated';
COMMENT ON COLUMN public.feature_backlog.criteria IS 'Array of testable criteria that define when feature is "done"';
COMMENT ON COLUMN public.feature_backlog.test_functions IS 'Array of test function names that validate this feature';

-- ============================================================================
-- 3. PATTERN MEMORY
-- ============================================================================
-- Stores patterns and learnings from past runs.
-- Retrieved when agent encounters similar situations.
-- This is the "memory layer" - what works, what doesn't, and when to use it.

CREATE TABLE IF NOT EXISTS public.pattern_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_type TEXT NOT NULL, -- 'formula_extraction', 'diagram_analysis', 'context_compilation', etc.
  trigger_context JSONB, -- When to retrieve this pattern (e.g., {"document_type": "pdf", "subject": "physics"})
  pattern_data JSONB NOT NULL, -- The actual pattern/learning
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure')),
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pattern_memory_type ON public.pattern_memory(pattern_type);
CREATE INDEX IF NOT EXISTS idx_pattern_memory_outcome ON public.pattern_memory(outcome);
CREATE INDEX IF NOT EXISTS idx_pattern_memory_last_used ON public.pattern_memory(last_used DESC);

-- GIN index for JSONB trigger_context queries
CREATE INDEX IF NOT EXISTS idx_pattern_memory_trigger_context ON public.pattern_memory USING gin(trigger_context);

-- Comments
COMMENT ON TABLE public.pattern_memory IS 'Stores learnings and patterns from past runs. Retrieved when agent encounters similar situations';
COMMENT ON COLUMN public.pattern_memory.pattern_type IS 'Type of pattern: formula_extraction, diagram_analysis, context_compilation, etc.';
COMMENT ON COLUMN public.pattern_memory.trigger_context IS 'JSON object describing when to retrieve this pattern (document type, subject, error type, etc.)';
COMMENT ON COLUMN public.pattern_memory.pattern_data IS 'The actual pattern/learning as JSON (e.g., {"approach": "...", "result": "..."})';

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.generation_progress_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_backlog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_memory ENABLE ROW LEVEL SECURITY;

-- Progress logs: Users can only see their own logs
DROP POLICY IF EXISTS "Users can view their own progress logs" ON public.generation_progress_log;
CREATE POLICY "Users can view their own progress logs"
ON public.generation_progress_log
FOR SELECT
USING (auth.uid()::text = user_id::text OR user_id IS NULL);

-- Feature backlog: Public read, admin write (shared learnings)
DROP POLICY IF EXISTS "Anyone can view feature backlog" ON public.feature_backlog;
CREATE POLICY "Anyone can view feature backlog"
ON public.feature_backlog
FOR SELECT
USING (true);

-- Pattern memory: Public read (shared learnings)
DROP POLICY IF EXISTS "Anyone can view patterns" ON public.pattern_memory;
CREATE POLICY "Anyone can view patterns"
ON public.pattern_memory
FOR SELECT
USING (true);

-- ============================================================================
-- 5. INITIAL FEATURE BACKLOG DATA
-- ============================================================================
-- Seed the feature backlog with critical features that need improvement

INSERT INTO public.feature_backlog (feature_id, title, description, status, criteria, test_functions)
VALUES
  (
    'formula_extraction',
    'Extract ALL formulas from documents',
    'AI must extract every formula, equation, and mathematical expression from documents without missing any',
    'failing',
    ARRAY[
      'Every formula in document appears in formulas array',
      'Formulas include page references',
      'No formulas are skipped or missed',
      'Formulas preserve mathematical notation correctly'
    ],
    ARRAY['test_formula_completeness', 'test_formula_page_refs', 'test_formula_notation']
  ),
  (
    'page_references',
    'Include page references in all content',
    'All fact-heavy content (bullets, examples, formulas) must include page references',
    'failing',
    ARRAY[
      'All formulas have page references',
      'All examples have page references',
      'All key terms have page references where defined',
      'Page references are accurate'
    ],
    ARRAY['test_page_refs_present', 'test_page_refs_accurate']
  ),
  (
    'no_generic_content',
    'Eliminate generic filler content',
    'AI must not create generic phrases like "Key point 1", "Important aspect", etc.',
    'failing',
    ARRAY[
      'No generic phrases in outline',
      'No generic phrases in concepts',
      'All content is document-specific',
      'Content could only come from this specific document'
    ],
    ARRAY['test_no_generic_filler', 'test_content_specificity']
  ),
  (
    'diagram_references',
    'Reference diagrams in relevant content',
    'When diagrams exist for a concept, questions and bullets should reference them',
    'untested',
    ARRAY[
      'Diagrams are referenced in relevant concept sections',
      'Questions reference diagrams when applicable',
      'Diagram page numbers are accurate'
    ],
    ARRAY['test_diagram_references', 'test_diagram_page_refs']
  ),
  (
    'context_compilation',
    'Compile focused context instead of full document',
    'AI should see only relevant document chunks, not entire document',
    'untested',
    ARRAY[
      'Context size is reduced by 50%+ without losing quality',
      'Relevant content is preserved',
      'Irrelevant content is excluded',
      'Token usage is reduced'
    ],
    ARRAY['test_context_size', 'test_context_relevance']
  )
ON CONFLICT (feature_id) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All tables created successfully. Features are disabled by default.
-- Enable via environment variables:
--   ENABLE_PROGRESS_LOGGING=true
--   ENABLE_PATTERN_MEMORY=true
--   ENABLE_FEATURE_BACKLOG=true
--   ENABLE_CONTEXT_COMPILATION=true

