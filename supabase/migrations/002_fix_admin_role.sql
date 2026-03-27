-- Run this in Supabase SQL Editor to ensure the admin profile has the correct role.
-- Replace the email below with the Google account email used by the administrator.

-- Step 1: Check which profiles exist
SELECT id, full_name, role, status FROM profiles ORDER BY role;

-- Step 2: To make a specific user an admin, update their profile.
-- First find the user by running Step 1, then update using their ID.
-- Example (replace the ID with the actual admin user ID from Step 1):

-- UPDATE profiles 
-- SET role = 'admin', status = 'approved'
-- WHERE id = 'YOUR-ADMIN-USER-ID-HERE';

-- OR to find by name:
-- UPDATE profiles 
-- SET role = 'admin', status = 'approved'
-- WHERE full_name ILIKE '%Ельчугин%' OR full_name ILIKE '%Elchugin%';
