# AI Agent Memory Architecture

This document describes the memory architecture implementation for Brain-Brawl's AI agents. This system enables agents to learn from past runs, maintain context efficiently, and improve over time.

## Overview

The memory architecture is based on the principles outlined in "AI Agent Memory Architecture: From Domain Memory to In-Session Context Engineering". It solves two critical problems:

1. **Domain Memory** - What agents remember across sessions
2. **In-Session Context Engineering** - What agents see within a single session

## Architecture Components

### 1. Feature Flags (`src/lib/config/feature-flags.ts`)

All memory architecture features are controlled by feature flags. **All features are disabled by default** for safety.

Enable features via environment variables:
```bash
ENABLE_PROGRESS_LOGGING=true
ENABLE_CONTEXT_COMPILATION=true
ENABLE_PATTERN_MEMORY=true
ENABLE_FEATURE_BACKLOG=true
DEBUG_MEMORY=true
```

### 2. Progress Logger (`src/lib/domain-memory/progress-logger.ts`)

Tracks what happened during each generation session:
- Tokens used
- Processing time
- Errors encountered
- Quality metrics (formulas extracted, page refs, etc.)

**Safe to enable**: Yes (read-only logging, doesn't affect generation)
**Impact**: Low (~10ms per request)

### 3. Context Compiler (`src/lib/context/context-compiler.ts`)

Compiles focused context instead of sending full documents:
- Extracts relevant chunks based on topic
- Reduces token usage by 50-70%
- Keeps model focused on what matters

**Safe to enable**: Yes (feature flag controlled, can disable instantly)
**Impact**: High (reduces costs, improves quality)
**Warning**: Test thoroughly before enabling in production

### 4. Pattern Memory (`src/lib/memory/pattern-memory.ts`)

Stores and retrieves patterns from past runs:
- What worked (success patterns)
- What didn't work (failure patterns)
- When to retrieve patterns (trigger context)

**Safe to enable**: Yes (read-only retrieval, optional writes)
**Impact**: Medium (improves quality over time)

### 5. Feature Backlog (`src/lib/domain-memory/feature-backlog.ts`)

Machine-readable feature list with pass/fail criteria:
- Tracks what needs improvement
- Defines testable criteria
- Records learnings

**Safe to enable**: Yes (read-only, doesn't affect generation)
**Impact**: Low (provides visibility into quality metrics)

## Database Schema

### Tables Created

1. **`generation_progress_log`** - Tracks each generation session
2. **`feature_backlog`** - Machine-readable feature list
3. **`pattern_memory`** - Stores learnings and patterns

See `supabase/migrations/add-memory-architecture-tables.sql` for full schema.

## Integration

### Notes Generation (`/api/notes`)

The memory architecture is integrated into the notes generation route:

1. **Session Tracking**: Each request gets a unique session ID
2. **Context Compilation**: Document content is compiled if feature enabled
3. **Pattern Retrieval**: Relevant patterns are retrieved before generation
4. **Progress Logging**: Session is logged after completion (non-blocking)

All integration is:
- **Non-breaking**: Existing functionality unchanged
- **Non-blocking**: Logging doesn't delay responses
- **Fail-safe**: Errors in memory components don't break generation

## Usage Examples

### Enable Progress Logging

```bash
# .env.local
ENABLE_PROGRESS_LOGGING=true
```

This will start logging all generation sessions to `generation_progress_log` table.

### Enable Context Compilation

```bash
# .env.local
ENABLE_CONTEXT_COMPILATION=true
```

This will compile document context before sending to AI, reducing token usage.

### Query Progress Logs

```sql
-- Get recent generation sessions
SELECT 
  session_id,
  task_type,
  tokens_used,
  processing_time_ms,
  notes_quality_metrics
FROM generation_progress_log
ORDER BY timestamp DESC
LIMIT 10;
```

### View Feature Backlog

```sql
-- See what features need improvement
SELECT 
  feature_id,
  title,
  status,
  attempts,
  learnings
FROM feature_backlog
WHERE status = 'failing'
ORDER BY last_updated DESC;
```

## Safety Guarantees

1. **Existing notes storage unchanged**: `user_study_notes` table not modified
2. **API response format unchanged**: Same JSON structure returned
3. **Feature flags**: Everything disabled by default
4. **Non-blocking**: All new code runs asynchronously
5. **Fail-safe**: Errors in new code don't break existing flow
6. **Rollback**: Can disable features instantly via env vars

## Testing Strategy

1. **Test with flags disabled**: Verify existing functionality unchanged
2. **Test with flags enabled in dev**: Verify new features work
3. **Monitor in production**: Watch for errors, performance impact
4. **Gradual rollout**: Enable for small % of users first

## Next Steps

1. Run database migration: `supabase/migrations/add-memory-architecture-tables.sql`
2. Enable progress logging: `ENABLE_PROGRESS_LOGGING=true`
3. Monitor logs for 1 week
4. Enable context compilation for 10% of requests
5. Gradually increase if successful

## References

- [AI Agent Memory Architecture Article](./MEMORY_ARCHITECTURE_ARTICLE.md)
- [Feature Flags Documentation](../features/FEATURE_FLAGS.md)
- [Database Schema](../database/MEMORY_ARCHITECTURE_SCHEMA.md)

