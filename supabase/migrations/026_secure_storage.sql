-- ═══════════════════════════════════════════════════════════════
-- Миграция 026: Ограничение Storage policies по префиксу пути
--
-- ПРОБЛЕМА:
--   Любой аутентифицированный пользователь может загружать,
--   изменять и удалять ЛЮБЫЕ файлы в бакете property-images.
--
-- РЕШЕНИЕ:
--   Ограничить доступ к файлам по префиксу: пользователи могут
--   управлять только файлами в своей директории: {user_id}/
--   Публичный доступ на чтение остаётся для всех файлов.
-- ═══════════════════════════════════════════════════════════════

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can upload property images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update property images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete property images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view property images" ON storage.objects;

-- ─── Политика загрузки: только в свою директорию ─────────────
-- Формат пути: {user_id}/property-{timestamp}.{ext}
CREATE POLICY "Users can upload own property images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ─── Политика обновления: только свои файлы ──────────────────
CREATE POLICY "Users can update own property images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ─── Политика удаления: только свои файлы ────────────────────
CREATE POLICY "Users can delete own property images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ─── Политика чтения: публичный доступ (для отображения на сайте) ─
CREATE POLICY "Public can view property images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'property-images');

-- ─── Комментарии ──────────────────────────────────────────────
COMMENT ON POLICY "Users can upload own property images" ON storage.objects IS 'Пользователи могут загружать файлы только в свою директорию {user_id}/';
COMMENT ON POLICY "Users can update own property images" ON storage.objects IS 'Пользователи могут изменять только свои файлы';
COMMENT ON POLICY "Users can delete own property images" ON storage.objects IS 'Пользователи могут удалять только свои файлы';
COMMENT ON POLICY "Public can view property images" ON storage.objects IS 'Публичный доступ на чтение для отображения на сайте';
