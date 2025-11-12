-- WebAuthn Credentials Table
-- Stores WebAuthn credentials for device PIN/biometric MFA
-- This is needed because Supabase doesn't natively support WebAuthn MFA factors

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE, -- Base64URL encoded credential ID
  public_key TEXT NOT NULL, -- JSON string of public key
  counter BIGINT DEFAULT 0, -- Signature counter for replay protection
  device_type TEXT, -- 'platform' or 'cross-platform'
  device_name TEXT, -- User-friendly device name
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  CONSTRAINT unique_user_credential UNIQUE (user_id, credential_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_webauthn_user_id ON webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credential_id ON webauthn_credentials(credential_id);

-- RLS Policies
ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotent migration)
DROP POLICY IF EXISTS "Users can view their own WebAuthn credentials" ON webauthn_credentials;
DROP POLICY IF EXISTS "Users can insert their own WebAuthn credentials" ON webauthn_credentials;
DROP POLICY IF EXISTS "Users can update their own WebAuthn credentials" ON webauthn_credentials;
DROP POLICY IF EXISTS "Users can delete their own WebAuthn credentials" ON webauthn_credentials;

-- Users can only see their own credentials
CREATE POLICY "Users can view their own WebAuthn credentials"
  ON webauthn_credentials
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own credentials
CREATE POLICY "Users can insert their own WebAuthn credentials"
  ON webauthn_credentials
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own credentials (for counter updates)
CREATE POLICY "Users can update their own WebAuthn credentials"
  ON webauthn_credentials
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own credentials
CREATE POLICY "Users can delete their own WebAuthn credentials"
  ON webauthn_credentials
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to check if user has WebAuthn MFA enabled
CREATE OR REPLACE FUNCTION user_has_webauthn_mfa(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM webauthn_credentials
    WHERE user_id = user_uuid
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to get user's WebAuthn credentials
CREATE OR REPLACE FUNCTION get_user_webauthn_credentials(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  credential_id TEXT,
  device_name TEXT,
  created_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
) AS $$
  SELECT 
    wc.id,
    wc.credential_id,
    wc.device_name,
    wc.created_at,
    wc.last_used_at
  FROM webauthn_credentials wc
  WHERE wc.user_id = user_uuid
  ORDER BY wc.created_at DESC;
$$ LANGUAGE SQL SECURITY DEFINER;

