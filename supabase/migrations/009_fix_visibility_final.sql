-- FINAL VISIBILITY FIX: Grant permissions to authenticated users
-- ВАЖНО: RLS политики настроены в миграциях 017, 023, 025.
-- Эта миграция ТОЛЬКО предоставляет права доступа, но НЕ отключает RLS.
-- Если эта миграция запускается после 017/023, команды DISABLE RLS игнорируются.

-- БЕЗОПАСНО: Эти команды игнорируются, если RLS уже включён в более поздних миграциях
-- Оставляем только GRANT для совместимости
-- ALTER TABLE properties DISABLE ROW LEVEL SECURITY;  -- УДАЛЕНО: нарушает безопасность
-- ALTER TABLE requests DISABLE ROW LEVEL SECURITY;    -- УДАЛЕНО: нарушает безопасность
-- ALTER TABLE clients DISABLE ROW LEVEL SECURITY;     -- УДАЛЕНО: нарушает безопасность
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;    -- УДАЛЕНО: нарушает безопасность
-- ALTER TABLE matches DISABLE ROW LEVEL SECURITY;     -- УДАЛЕНО: нарушает безопасность
-- ALTER TABLE showings DISABLE ROW LEVEL SECURITY;    -- УДАЛЕНО: нарушает безопасность

-- Предоставляем права доступа (безопасно, RLS всё ещё активен)
GRANT ALL ON TABLE properties TO authenticated;
GRANT ALL ON TABLE requests TO authenticated;
GRANT ALL ON TABLE clients TO authenticated;
GRANT ALL ON TABLE profiles TO authenticated;
GRANT ALL ON TABLE matches TO authenticated;
GRANT ALL ON TABLE showings TO authenticated;

-- Keep Tasks private (optional)
-- If you want everyone to see each other's tasks, uncomment the line below:
-- ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- Verification query (run this to see if you have data)
-- SELECT count(*) FROM properties;
