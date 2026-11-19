import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL);

// Набор проверенных высококачественных фото интерьеров и фасадов
const PHOTOS_BY_ROOMS = {
  0: 'https://storage.yandexcloud.net/zhelezno-media/media/p/ps/i/8adcc3a123fba1b59edd563bf8b7cd156b757d4e.jpg',
  1: 'https://storage.yandexcloud.net/zhelezno-media/media/p/ps/i/74d49dd475c6b09c3d66e56c268f58d661be02ac.jpg',
  2: 'https://storage.yandexcloud.net/zhelezno-media/media/p/ps/i/ffc5c71c6abc1e2c9bbc17112bff4d31ac2da238.jpg',
  3: 'https://storage.yandexcloud.net/zhelezno-media/media/p/ps/i/a671f9897579c8f3a2faa251adb65f70f755bd26.jpg',
  4: 'https://storage.yandexcloud.net/zhelezno-media/media/p/ps/i/be0b0b51c6ec9ebb35bc169f5c9a27a35c9bf3fb.jpg',
  default: '/images/developments/zhk-bulychev.jpg',
};

async function main() {
  console.log('--- Обогащение analog_listings фотографиями ---');

  for (const [rooms, url] of Object.entries(PHOTOS_BY_ROOMS)) {
    const rNum = rooms === 'default' ? null : Number(rooms);
    if (rNum !== null) {
      const res = await sql.query(`
        UPDATE analog_listings
        SET raw_data = jsonb_set(COALESCE(raw_data::jsonb, '{}'::jsonb), '{image_url}', to_jsonb($1::text))
        WHERE (raw_data->>'image_url' IS NULL OR raw_data->>'image_url' = '')
          AND rooms = $2
      `, [url, rNum]);
      console.log(`Обновлено для комнатности ${rNum}:`, res.count || res.length);
    }
  }

  // Для остальных (NULL rooms или > 4)
  const remaining = await sql.query(`
    UPDATE analog_listings
    SET raw_data = jsonb_set(COALESCE(raw_data::jsonb, '{}'::jsonb), '{image_url}', to_jsonb($1::text))
    WHERE (raw_data->>'image_url' IS NULL OR raw_data->>'image_url' = '')
  `, [PHOTOS_BY_ROOMS.default]);
  console.log('Обновлено остальных:', remaining.count || remaining.length);

  const stats = await sql.query(`
    SELECT source, 
           count(id) as total, 
           count(CASE WHEN raw_data->>'image_url' IS NOT NULL AND raw_data->>'image_url' != '' THEN 1 END) as with_photo
    FROM analog_listings
    WHERE is_active = true
    GROUP BY source
  `);
  console.log('Итог с фото:', stats);
}

main().catch(console.error);
