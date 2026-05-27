-- Migration 045: Add google_refresh_token to profiles
-- Stores encrypted Google OAuth refresh token server-side.
-- This token is never sent to the frontend — only used by Edge Function.

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;

-- RLS: only service_role can read/write this column
-- (anon and authenticated roles cannot select it directly)
COMMENT ON COLUMN profiles.google_refresh_token IS 
  'Google OAuth refresh token. Managed by google-calendar-token Edge Function only.';
