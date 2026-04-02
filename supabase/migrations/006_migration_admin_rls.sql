-- Helper function to check if the current user is an admin without recursion
-- "security definer" allows bypassing RLS for this specific query
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Drop existing policies
drop policy if exists "profile_select_own" on profiles;
drop policy if exists "profile_update_own" on profiles;
drop policy if exists "profile_select_admin" on profiles;
drop policy if exists "profile_update_admin" on profiles;

-- New select policy: users see themselves, admins see everyone
create policy "profile_select_admin" on profiles
for select using (
  auth.uid() = id OR public.is_admin()
);

-- New update policy: users update themselves, admins update everyone
create policy "profile_update_admin" on profiles
for update using (
  auth.uid() = id OR public.is_admin()
) with check (
  auth.uid() = id OR public.is_admin()
);
