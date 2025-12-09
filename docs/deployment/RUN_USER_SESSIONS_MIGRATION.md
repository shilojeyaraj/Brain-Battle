# Run User Sessions Migration

## Problem
The `user_sessions` table is missing from your database, which causes session tracking errors. The session cookie still works, but single-device login enforcement won't function.

## Solution

### Option 1: Run Migration via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/add-user-sessions-table.sql`
4. Paste and run the SQL in the SQL Editor
5. Verify the table was created by running:
   ```sql
   SELECT * FROM public.user_sessions LIMIT 1;
   ```

### Option 2: Run Migration via Supabase CLI

If you have Supabase CLI installed:

```bash
# Make sure you're in the project root
cd /path/to/Brain-Brawl

# Link to your Supabase project (if not already linked)
supabase link --project-ref your-project-ref

# Run the migration
supabase db push
```

### Option 3: Manual SQL Execution

Connect to your Supabase database and run:

```sql
-- Create user_sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  user_agent TEXT,
  ip_address INET
);

-- Add foreign key if users table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE public.user_sessions 
    ADD CONSTRAINT fk_user_sessions_user_id 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(user_id, is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "user_sessions_select_own"
ON public.user_sessions
FOR SELECT
USING (user_id = auth.uid());

-- Service role can manage all sessions
CREATE POLICY "user_sessions_service_role"
ON public.user_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

## Verification

After running the migration, check the logs - you should see:
```
✅ [SESSION] Session stored in database: { userId: '...', sessionId: '...' }
```

Instead of:
```
❌ [SESSION] Error storing session in database: Could not find the table 'public.user_sessions'
```

## Impact

- **Before migration**: Session cookies work, but single-device login enforcement doesn't work
- **After migration**: Full session tracking and single-device login enforcement works correctly

