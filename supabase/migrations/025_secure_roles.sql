-- ═══════════════════════════════════════════════════════════════
-- Миграция 025: Защита ролей от эскалации привилегий
--
-- ПРОБЛЕМА:
--   Функция is_admin() проверяет роль из публичной таблицы profiles.
--   Любой пользователь может выполнить UPDATE profiles SET role = 'admin'.
--
-- РЕШЕНИЕ:
--   1. Создать защищённую таблицу user_roles с доступом только через security definer
--   2. Перенести роли из profiles.role в user_roles
--   3. Обновить функцию is_admin() для чтения из user_roles
--   4. Добавить триггер для защиты поля role от изменений не-администраторами
-- ═══════════════════════════════════════════════════════════════

-- ─── Шаг 1: Создаём защищённую таблицу ролей ─────────────────

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'realtor' CHECK (role IN ('realtor', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Включаем RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Политики для user_roles: только security definer функции имеют доступ
-- (обычные пользователи не могут читать/изменять эту таблицу напрямую)
CREATE POLICY "user_roles_access_via_definer_only" ON user_roles
FOR ALL TO authenticated
USING (false)
WITH CHECK (false);

-- ─── Шаг 2: Миграция существующих ролей из profiles ──────────

-- Копируем роли из profiles в user_roles
INSERT INTO user_roles (user_id, role)
SELECT id, role FROM profiles
WHERE role IS NOT NULL AND role IN ('realtor', 'admin')
ON CONFLICT (user_id) DO NOTHING;

-- ─── Шаг 3: Обновляем функцию is_admin() ─────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения роли пользователя (только для админов)
CREATE OR REPLACE FUNCTION public.get_user_role(target_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Проверяем, что вызывающий - администратор
  IF NOT public.is_admin() AND auth.uid() != target_user_id THEN
    RETURN NULL;
  END IF;
  
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = target_user_id;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Шаг 4: Функции для управления ролями (только для админов) ─

CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id UUID, new_role TEXT)
RETURNS void AS $$
BEGIN
  -- Разрешаем только администраторам
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Только администраторы могут изменять роли';
  END IF;
  
  -- Проверяем валидность роли
  IF new_role NOT IN ('realtor', 'admin') THEN
    RAISE EXCEPTION 'Недопустимая роль: %', new_role;
  END IF;
  
  INSERT INTO user_roles (user_id, role)
  VALUES (target_user_id, new_role)
  ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Шаг 5: Триггер для защиты поля role в profiles ──────────

-- Функция триггера: блокирует изменение role не-администраторами
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Разрешаем изменение role только администраторам
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Только администраторы могут изменять роль пользователя';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаём триггер на таблице profiles
DROP TRIGGER IF EXISTS protect_role_trigger ON profiles;
CREATE TRIGGER protect_role_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

-- ─── Шаг 6: Обновляем политики profiles ──────────────────────

-- Обновляем политику обновления profiles, чтобы явно запретить изменение role
DROP POLICY IF EXISTS "profiles_modify_own" ON profiles;
CREATE POLICY "profiles_modify_own" ON profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ─── Комментарии ──────────────────────────────────────────────

COMMENT ON TABLE user_roles IS 'Защищённая таблица ролей. Доступ только через security definer функции.';
COMMENT ON FUNCTION public.is_admin() IS 'Проверяет роль администратора из защищённой таблицы user_roles.';
COMMENT ON FUNCTION public.set_user_role(UUID, TEXT) IS 'Устанавливает роль пользователя. Только для администраторов.';
COMMENT ON TRIGGER protect_role_trigger ON profiles IS 'Защищает поле role от изменений не-администраторами.';
