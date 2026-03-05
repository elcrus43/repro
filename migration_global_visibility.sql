-- Migration: Global visibility for properties, requests and profiles
-- This allows realtors to see each other's data for matching purposes

-- 1. Profiles: allow all authenticated users to see other profiles
drop policy if exists "profile_select_own" on profiles;
drop policy if exists "profile_select_admin" on profiles;
drop policy if exists "profile_select_all" on profiles;

create policy "profile_select_all" on profiles
for select using (auth.role() = 'authenticated');

-- 2. Properties: allow all authenticated users to see all properties
drop policy if exists "properties_select" on properties;
create policy "properties_select_all" on properties
for select using (auth.role() = 'authenticated');

-- 3. Requests: allow all authenticated users to see all requests
drop policy if exists "requests_select" on requests;
create policy "requests_select_all" on requests
for select using (auth.role() = 'authenticated');

-- Note: clients, matches, showings, and tasks remain restricted to the owner.
