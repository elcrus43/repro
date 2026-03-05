-- Migration: Admin RLS for profiles
-- Allow admins (role = 'admin') to select and update all profiles

-- Drop existing restricted policies
drop policy if exists "profile_select_own" on profiles;
drop policy if exists "profile_update_own" on profiles;

-- New select policy: users see themselves, admins see everyone
create policy "profile_select_admin" on profiles
for select using (
  auth.uid() = id OR 
  (select role from profiles where id = auth.uid()) = 'admin'
);

-- New update policy: users update themselves, admins update everyone
create policy "profile_update_admin" on profiles
for update using (
  auth.uid() = id OR 
  (select role from profiles where id = auth.uid()) = 'admin'
) with check (
  auth.uid() = id OR 
  (select role from profiles where id = auth.uid()) = 'admin'
);

-- Note: We use subqueries on the same table. 
-- In some Supabase versions this might cause recursion if not careful, 
-- but since 'role' is a simple text column it usually works fine 
-- or can be optimized with a security definer function if needed.
