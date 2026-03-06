-- SELECTIVE VISIBILITY: Public Properties & Requests, Private Clients
-- This script ensures realtors can collaborate on objects while keeping their client database private.

-- 1. Profiles (Public to authenticated)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "profiles_modify_own" ON profiles;
CREATE POLICY "profiles_modify_own" ON profiles FOR ALL USING (id = auth.uid());

-- 2. Properties (Public to authenticated for SELECT)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "properties_select_all" ON properties;
CREATE POLICY "properties_select_all" ON properties FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "properties_modify_own" ON properties;
CREATE POLICY "properties_modify_own" ON properties FOR ALL USING (realtor_id = auth.uid());

-- 3. Requests (Public to authenticated for SELECT)
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "requests_select_all" ON requests;
CREATE POLICY "requests_select_all" ON requests FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "requests_modify_own" ON requests;
CREATE POLICY "requests_modify_own" ON requests FOR ALL USING (realtor_id = auth.uid());

-- 4. Clients (PRIVATE - Only visible to owner)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clients_select_own" ON clients;
CREATE POLICY "clients_select_own" ON clients FOR SELECT USING (realtor_id = auth.uid());
DROP POLICY IF EXISTS "clients_modify_own" ON clients;
CREATE POLICY "clients_modify_own" ON clients FOR ALL USING (realtor_id = auth.uid());

-- 5. Matches (Public for SELECT to see cross-agent matches)
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "matches_select_all" ON matches;
CREATE POLICY "matches_select_all" ON matches FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "matches_modify_own" ON matches;
CREATE POLICY "matches_modify_own" ON matches FOR ALL USING (realtor_id = auth.uid());

-- 6. Showings (Public SELECT for coordination, private ALL)
ALTER TABLE showings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "showings_select_all" ON showings;
CREATE POLICY "showings_select_all" ON showings FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "showings_modify_own" ON showings;
CREATE POLICY "showings_modify_own" ON showings FOR ALL USING (realtor_id = auth.uid());

-- 7. Tasks (STRICTLY PRIVATE)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks_all_own" ON tasks;
CREATE POLICY "tasks_all_own" ON tasks FOR ALL USING (realtor_id = auth.uid());
