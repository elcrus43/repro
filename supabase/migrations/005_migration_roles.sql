-- Migration: Add status field to profiles for user approval flow
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';

-- All existing users are automatically approved
UPDATE profiles SET status = 'approved' WHERE status IS NULL OR status = '';

-- The admin (yelchugin@gmail.com) will be set to admin role automatically by the app
-- when first login is detected. If they already have a profile, update it here:
-- UPDATE profiles SET role = 'admin', status = 'approved'
-- WHERE id IN (SELECT id FROM auth.users WHERE email = 'yelchugin@gmail.com');

-- New registrations will get status = 'pending' via app code
-- and must be approved by admin before they can log in.
