-- Create user_sessions table to track active sessions
-- This enables single-device login by invalidating previous sessions when a new login occurs

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE, -- The JWT token ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  user_agent TEXT,
  ip_address TEXT
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(user_id, is_active) WHERE is_active = TRUE;

-- Enable Row Level Security
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_sessions
-- Users can only see their own sessions
CREATE POLICY "user_sessions_select_own"
ON public.user_sessions
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = user_sessions.user_id
    AND u.id = (SELECT id FROM public.users WHERE id = auth.uid())
  )
);

-- Service role can insert/update/delete (for API operations)
CREATE POLICY "user_sessions_service_role"
ON public.user_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to clean up expired sessions (can be run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.user_sessions
  WHERE expires_at < NOW() OR is_active = FALSE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON TABLE public.user_sessions IS 
'Stores active user sessions. Only one active session per user is allowed. When a new login occurs, previous sessions are invalidated.';

COMMENT ON COLUMN public.user_sessions.session_token IS 
'Unique identifier for the session (stored in JWT token). Used to verify session validity.';

COMMENT ON COLUMN public.user_sessions.is_active IS 
'Whether the session is currently active. Set to FALSE when user logs in on another device.';

