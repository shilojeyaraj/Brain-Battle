-- ============================================================================
-- Add email column to profiles table
-- ============================================================================
-- This script adds an email column to the profiles table
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Add email column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Create index on email for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Optional: Populate email from users table if profiles.user_id matches users.id
-- Uncomment the following if you want to backfill existing profiles with emails
-- UPDATE public.profiles p
-- SET email = u.email
-- FROM public.users u
-- WHERE p.user_id = u.id
-- AND p.email IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.profiles.email IS 'User email address (can be synced from users table)';

