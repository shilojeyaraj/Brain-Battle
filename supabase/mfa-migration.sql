-- MFA Migration Script
-- Run this in your Supabase SQL Editor to add MFA support to your users table

-- Add MFA columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mfa_secret TEXT,
ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT[];

-- Add index for faster MFA lookups
CREATE INDEX IF NOT EXISTS idx_users_mfa_enabled ON users(mfa_enabled) WHERE mfa_enabled = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN users.mfa_enabled IS 'Whether the user has MFA enabled';
COMMENT ON COLUMN users.mfa_secret IS 'TOTP secret (base32 encoded) - should be encrypted in production';
COMMENT ON COLUMN users.mfa_backup_codes IS 'Array of hashed backup codes for MFA recovery';

-- Optional: Create a function to check MFA status
CREATE OR REPLACE FUNCTION check_user_mfa_status(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_id AND mfa_enabled = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

