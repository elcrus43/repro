-- 028_fix_properties_rls_for_images.sql
-- Исправление RLS политик для properties - ошибка "new row violates row-level security policy"

-- Удаляем старую политику
DROP POLICY IF EXISTS properties_modify_own ON properties;

-- Создаем отдельные политики для INSERT и UPDATE/DELETE
-- INSERT - разрешаем если realtor_id совпадает с текущим пользователем
DROP POLICY IF EXISTS properties_insert_own ON properties;
CREATE POLICY properties_insert_own ON properties
FOR INSERT TO authenticated
WITH CHECK (realtor_id = auth.uid());

-- SELECT - видим свои объекты + админ видит все
DROP POLICY IF EXISTS properties_select_own ON properties;
CREATE POLICY properties_select_own ON properties
FOR SELECT TO authenticated
USING (
    realtor_id = auth.uid() 
    OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- UPDATE - можно обновлять только свои объекты
DROP POLICY IF EXISTS properties_update_own ON properties;
CREATE POLICY properties_update_own ON properties
FOR UPDATE TO authenticated
USING (realtor_id = auth.uid())
WITH CHECK (realtor_id = auth.uid());

-- DELETE - можно удалять только свои объекты
DROP POLICY IF EXISTS properties_delete_own ON properties;
CREATE POLICY properties_delete_own ON properties
FOR DELETE TO authenticated
USING (realtor_id = auth.uid());
