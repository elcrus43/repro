-- Migration: Global visibility for properties, requests, profiles, clients, matches, and showings
-- This allows realtors to see each other's data for matching purposes

-- 1. Profiles: allow all authenticated users to see other profiles
drop policy if exists "profile_select_own" on profiles;
drop policy if exists "profile_select_admin" on profiles;
drop policy if exists "profile_select_all" on profiles;
create policy "profile_select_all" on profiles for select using (auth.role() = 'authenticated');

-- 2. Properties: allow all authenticated users to see all properties
drop policy if exists "properties_select" on properties;
drop policy if exists "properties_select_all" on properties;
create policy "properties_select_all" on properties for select using (auth.role() = 'authenticated');

-- 3. Requests: allow all authenticated users to see all requests
drop policy if exists "requests_select" on requests;
drop policy if exists "requests_select_all" on requests;
create policy "requests_select_all" on requests for select using (auth.role() = 'authenticated');

-- 4. Clients: allow all authenticated users to see all clients
drop policy if exists "clients_select" on clients;
drop policy if exists "clients_select_all" on clients;
create policy "clients_select_all" on clients for select using (auth.role() = 'authenticated');

-- 5. Matches: allow all authenticated users to see all matches
drop policy if exists "matches_select" on matches;
drop policy if exists "matches_select_all" on matches;
create policy "matches_select_all" on matches for select using (auth.role() = 'authenticated');

-- 6. Showings: allow all authenticated users to see all showings
drop policy if exists "showings_select" on showings;
drop policy if exists "showings_select_all" on showings;
create policy "showings_select_all" on showings for select using (auth.role() = 'authenticated');

-- 7. Admin Overrides: Admins can do anything
-- This assumes roles are stored in the 'profiles' table and we can check it.
-- A more robust way is to use a function or check the jwt claims if possible, 
-- but for now we'll stick to basic authenticated SELECT for visibility.
-- For INSERT/UPDATE/DELETE, we still keep it restricted to owners unless we implement admin-specific policies.

-- Note: Tasks remain restricted to the owner for personal organization.
