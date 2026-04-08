-- 024_fix_rls_and_add_columns.sql
-- Выполнить в Supabase Dashboard → SQL Editor

-- 1. Добавить колонку images в properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- 2. Добавить колонку event_type в showings
ALTER TABLE showings ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'showing';

-- 3. Исправить RLS политику для properties
-- Удаляем старую политику
DROP POLICY IF EXISTS properties_modify_own ON properties;

-- Создаем новую с явным WITH CHECK для INSERT
CREATE POLICY properties_modify_own ON properties 
FOR ALL TO authenticated 
USING (realtor_id = auth.uid())
WITH CHECK (realtor_id = auth.uid());

-- 4. Исправить RLS политику для showings
DROP POLICY IF EXISTS showings_modify_own ON showings;

CREATE POLICY showings_modify_own ON showings 
FOR ALL TO authenticated 
USING (realtor_id = auth.uid())
WITH CHECK (realtor_id = auth.uid());

-- 5. Исправить RLS политику для clients
DROP POLICY IF EXISTS clients_modify_own ON clients;

CREATE POLICY clients_modify_own ON clients 
FOR ALL TO authenticated 
USING (realtor_id = auth.uid())
WITH CHECK (realtor_id = auth.uid());

-- 6. Исправить RLS политику для requests
DROP POLICY IF EXISTS requests_modify_own ON requests;

CREATE POLICY requests_modify_own ON requests 
FOR ALL TO authenticated 
USING (realtor_id = auth.uid())
WITH CHECK (realtor_id = auth.uid());

-- 7. Исправить RLS политику для tasks
DROP POLICY IF EXISTS tasks_all_own ON tasks;

CREATE POLICY tasks_all_own ON tasks 
FOR ALL TO authenticated 
USING (realtor_id = auth.uid())
WITH CHECK (realtor_id = auth.uid());
