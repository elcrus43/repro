-- 023_add_property_images.sql
-- Выполнить в Supabase Dashboard → SQL Editor

-- 1. Добавить колонку images (массив URL)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- 2. Добавить колонку cover_image (главное фото)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- 3. Storage policies
CREATE POLICY IF NOT EXISTS "Users can upload property images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'property-images');

CREATE POLICY IF NOT EXISTS "Users can update property images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'property-images');

CREATE POLICY IF NOT EXISTS "Users can delete property images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'property-images');

CREATE POLICY IF NOT EXISTS "Public can view property images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'property-images');
