# Memory Architecture Quick Start Guide

This guide will help you get started with the memory architecture system.

## Step 1: Run Database Migration

First, run the database migration to create the necessary tables:

```sql
-- Run this in your Supabase SQL editor
-- File: supabase/migrations/add-memory-architecture-tables.sql
```

Or if using Supabase CLI:
```bash
supabase migration up
```

## Step 2: Enable Feature Flags

Add to your `.env.local` file:

```bash
# Enable progress logging (safest, start here)
ENABLE_PROGRESS_LOGGING=true

# Enable debug mode to see what's happening
DEBUG_MEMORY=true
```

## Step 3: Test in Development

1. Generate some study notes
2. Check the logs for memory architecture messages:
   ```
   📊 [MEMORY] Session ID: ...
   📊 [MEMORY] Enabled features: ...
   ```

3. Query the progress log:
   ```sql
   SELECT * FROM generation_progress_log 
   ORDER BY timestamp DESC 
   LIMIT 5;
   ```

## Step 4: Enable Context Compilation (Optional)

Once you've verified progress logging works:

```bash
# .env.local
ENABLE_CONTEXT_COMPILATION=true
```

**Warning**: Test thoroughly before enabling in production. Start with a small percentage of requests.

## Step 5: Enable Pattern Memory (Optional)

```bash
# .env.local
ENABLE_PATTERN_MEMORY=true
```

This will start storing and retrieving patterns from past runs.

## Step 6: Enable Feature Backlog (Optional)

```bash
# .env.local
ENABLE_FEATURE_BACKLOG=true
```

This enables the feature backlog system for tracking improvements.

## Monitoring

### Check Progress Logs

```sql
-- Recent sessions
SELECT 
  session_id,
  task_type,
  tokens_used,
  processing_time_ms,
  errors_encountered,
  notes_quality_metrics
FROM generation_progress_log
ORDER BY timestamp DESC
LIMIT 10;
```

### Check Feature Backlog

```sql
-- Features that need work
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

### Check Patterns

```sql
-- Successful patterns
SELECT 
  pattern_type,
  outcome,
  usage_count,
  last_used
FROM pattern_memory
WHERE outcome = 'success'
ORDER BY usage_count DESC
LIMIT 10;
```

## Troubleshooting

### Features Not Working

1. Check feature flags are enabled in `.env.local`
2. Restart your dev server after changing env vars
3. Check logs for `[MEMORY]` messages
4. Verify database migration ran successfully

### Performance Issues

- Progress logging adds ~10ms per request (acceptable)
- Context compilation should REDUCE token usage (check logs)
- Pattern retrieval is cached and fast

### Errors in Logs

- Memory architecture errors are non-critical
- They won't break note generation
- Check `DEBUG_MEMORY=true` for detailed logs

## Rollback

To disable all features instantly:

```bash
# .env.local - remove or set to false
ENABLE_PROGRESS_LOGGING=false
ENABLE_CONTEXT_COMPILATION=false
ENABLE_PATTERN_MEMORY=false
ENABLE_FEATURE_BACKLOG=false
```

Then restart your server.

## Next Steps

- Read the [full documentation](./README.md)
- Review the [database schema](../database/MEMORY_ARCHITECTURE_SCHEMA.md)
- Check [feature flags documentation](../features/FEATURE_FLAGS.md)

