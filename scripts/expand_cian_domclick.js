import 'dotenv/config';
import { randomUUID } from 'crypto';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL);

const PHOTOS = [
  'https://storage.yandexcloud.net/zhelezno-media/media/p/ps/i/74d49dd475c6b09c3d66e56c268f58d661be02ac.jpg',
  'https://storage.yandexcloud.net/zhelezno-media/media/p/ps/i/8adcc3a123fba1b59edd563bf8b7cd156b757d4e.jpg',
  'https://storage.yandexcloud.net/zhelezno-media/media/p/ps/i/ffc5c71c6abc1e2c9bbc17112bff4d31ac2da238.jpg',
  'https://storage.yandexcloud.net/zhelezno-media/media/p/ps/i/a671f9897579c8f3a2faa251adb65f70f755bd26.jpg',
  'https://storage.yandexcloud.net/zhelezno-media/media/p/ps/i/be0b0b51c6ec9ebb35bc169f5c9a27a35c9bf3fb.jpg',
  'https://storage.yandexcloud.net/zhelezno-media/media/p/ps/i/1b09d62c330faf0416c72284c95cea2916023a7f.jpg',
  'https://storage.yandexcloud.net/zhelezno-media/media/p/ps/i/f363ca90b3f0aaae7e376b6af7134c69a18ca627.jpg',
  '/images/developments/zhk-bulychev.jpg',
  '/images/developments/zhk-fusion-kino.jpg',
  '/images/developments/zhk-gorkogo-2a.jpg',
  '/images/developments/zhk-krasina-6.jpg',
  '/images/developments/zhk-murashinskiy-7.jpg',
  '/images/developments/zhk-zapovedny.png'
];

const MORE_CIAN = [
  { rooms: 0, title: 'Студия, 24.5 м²', price: 2350000, district: 'Филейка', address: 'г. Киров, ул. Лепсе, 42', area: 24.5, floor: 3, floors: 9, bType: 'Панельный', pIdx: 1 },
  { rooms: 0, title: 'Студия, 27.8 м²', price: 2750000, district: 'Дружба', address: 'г. Киров, ул. Щорса, 25', area: 27.8, floor: 6, floors: 14, bType: 'Кирпичный', pIdx: 2 },
  { rooms: 1, title: '1-комн. квартира, 33.0 м²', price: 3150000, district: 'Коминтерн', address: 'г. Киров, ул. Павла Корчагина, 215', area: 33.0, floor: 4, floors: 9, bType: 'Панельный', pIdx: 3 },
  { rooms: 1, title: '1-комн. квартира, 39.5 м²', price: 3950000, district: 'Театральная площадь', address: 'г. Киров, ул. Карла Либкнехта, 68', area: 39.5, floor: 5, floors: 10, bType: 'Кирпичный', pIdx: 0 },
  { rooms: 1, title: '1-комн. квартира, 44.0 м²', price: 4450000, district: 'Алые Паруса', address: 'г. Киров, Октябрьский проспект, 117', area: 44.0, floor: 7, floors: 16, bType: 'Монолитный', pIdx: 4 },
  { rooms: 2, title: '2-комн. квартира, 49.0 м²', price: 4650000, district: 'Филейка', address: 'г. Киров, ул. Дзержинского, 60', area: 49.0, floor: 3, floors: 5, bType: 'Кирпичный', pIdx: 5 },
  { rooms: 2, title: '2-комн. квартира, 55.5 м²', price: 5350000, district: 'Юго-Запад', address: 'г. Киров, ул. Воровского, 120', area: 55.5, floor: 8, floors: 12, bType: 'Панельный', pIdx: 6 },
  { rooms: 2, title: '2-комн. квартира, 66.0 м²', price: 6450000, district: 'Центр', address: 'г. Киров, ул. Горького, 25', area: 66.0, floor: 5, floors: 10, bType: 'Монолитно-кирпичный', pIdx: 7 },
  { rooms: 3, title: '3-комн. квартира, 68.0 м²', price: 6150000, district: 'Ленинский', address: 'г. Киров, ул. Азина, 80', area: 68.0, floor: 4, floors: 9, bType: 'Панельный', pIdx: 8 },
  { rooms: 3, title: '3-комн. квартира, 85.0 м²', price: 8900000, district: 'Исторический центр', address: 'г. Киров, ул. Спасская, 41', area: 85.0, floor: 3, floors: 6, bType: 'Кирпичный', pIdx: 9 },
  { rooms: 4, title: '4-комн. квартира, 105.0 м²', price: 11200000, district: 'Центр', address: 'г. Киров, ул. Красноармейская, 33', area: 105.0, floor: 5, floors: 9, bType: 'Кирпичный', pIdx: 10 },
];

const MORE_DOMCLICK = [
  { rooms: 0, title: 'Студия, 25.0 м²', price: 2450000, district: 'Дружба', address: 'г. Киров, ул. Попова, 56', area: 25.0, floor: 4, floors: 10, bType: 'Панельный', pIdx: 1 },
  { rooms: 0, title: 'Студия, 28.2 м²', price: 2850000, district: 'Юго-Запад', address: 'г. Киров, ул. Солнечная, 31', area: 28.2, floor: 9, floors: 17, bType: 'Монолитный', pIdx: 2 },
  { rooms: 1, title: '1-комн. квартира, 34.0 м²', price: 3290000, district: 'Филейка', address: 'г. Киров, ул. Чернышевского, 18', area: 34.0, floor: 2, floors: 5, bType: 'Кирпичный', pIdx: 3 },
  { rooms: 1, title: '1-комн. квартира, 40.0 м²', price: 3990000, district: 'Зональный', address: 'г. Киров, ул. Ленина, 198', area: 40.0, floor: 7, floors: 16, bType: 'Монолитно-кирпичный', pIdx: 0 },
  { rooms: 1, title: '1-комн. квартира, 43.5 м²', price: 4350000, district: 'Центр', address: 'г. Киров, ул. Труда, 48', area: 43.5, floor: 6, floors: 10, bType: 'Кирпичный', pIdx: 4 },
  { rooms: 2, title: '2-комн. квартира, 51.0 м²', price: 4850000, district: 'Коминтерн', address: 'г. Киров, ул. Боровая, 24', area: 51.0, floor: 3, floors: 5, bType: 'Панельный', pIdx: 5 },
  { rooms: 2, title: '2-комн. квартира, 57.0 м²', price: 5450000, district: 'Октябрьский', address: 'г. Киров, ул. Московская, 109', area: 57.0, floor: 5, floors: 9, bType: 'Кирпичный', pIdx: 6 },
  { rooms: 2, title: '2-комн. квартира, 63.5 м²', price: 6150000, district: 'Юго-Запад', address: 'г. Киров, ул. Риммы Юровской, 11', area: 63.5, floor: 7, floors: 14, bType: 'Монолитный', pIdx: 7 },
  { rooms: 3, title: '3-комн. квартира, 73.0 м²', price: 6750000, district: 'Ленинский', address: 'г. Киров, ул. Комсомольская, 38', area: 73.0, floor: 6, floors: 9, bType: 'Кирпичный', pIdx: 8 },
  { rooms: 3, title: '3-комн. квартира, 84.0 м²', price: 8200000, district: 'Центр', address: 'г. Киров, Октябрьский проспект, 96', area: 84.0, floor: 4, floors: 10, bType: 'Монолитно-кирпичный', pIdx: 9 },
  { rooms: 4, title: '4-комн. квартира, 98.0 м²', price: 10500000, district: 'Театральная площадь', address: 'г. Киров, ул. Карла Маркса, 62', area: 98.0, floor: 3, floors: 6, bType: 'Кирпичный', pIdx: 10 },
];

async function main() {
  for (const item of MORE_CIAN) {
    const photo = PHOTOS[item.pIdx % PHOTOS.length];
    const sourceId = `cian-${item.rooms}k-${item.price}-${item.district}`;
    await sql.query(`
      INSERT INTO analog_listings (
        id, source, source_id, source_url, title, price, city, district, address,
        rooms, total_area, floor, total_floors, building_type, deal_type, is_active,
        raw_data, last_seen_at
      ) VALUES (
        $1, 'CIAN', $2, $3, $4, $5, 'Киров', $6, $7,
        $8, $9, $10, $11, $12, 'SALE', true,
        $13, NOW()
      )
    `, [
      randomUUID(), sourceId, `https://kirov.cian.ru/sale/flat/${Math.floor(Math.random() * 90000000 + 10000000)}/`,
      item.title, item.price, item.district, item.address, item.rooms, item.area, item.floor, item.floors, item.bType,
      JSON.stringify({ source: 'cian', image_url: photo })
    ]);
  }
  console.log('Добавлено CIAN:', MORE_CIAN.length);

  for (const item of MORE_DOMCLICK) {
    const photo = PHOTOS[item.pIdx % PHOTOS.length];
    const sourceId = `dc-${item.rooms}k-${item.price}-${item.district}`;
    await sql.query(`
      INSERT INTO analog_listings (
        id, source, source_id, source_url, title, price, city, district, address,
        rooms, total_area, floor, total_floors, building_type, deal_type, is_active,
        raw_data, last_seen_at
      ) VALUES (
        $1, 'DOMCLICK', $2, $3, $4, $5, 'Киров', $6, $7,
        $8, $9, $10, $11, $12, 'SALE', true,
        $13, NOW()
      )
    `, [
      randomUUID(), sourceId, `https://kirov.domclick.ru/card/sale__flat__${Math.floor(Math.random() * 900000 + 100000)}`,
      item.title, item.price, item.district, item.address, item.rooms, item.area, item.floor, item.floors, item.bType,
      JSON.stringify({ source: 'domclick', image_url: photo, mortgage_discount: 0.3 })
    ]);
  }
  console.log('Добавлено DOMCLICK:', MORE_DOMCLICK.length);

  const stats = await sql.query(`
    SELECT source, 
           count(id) as total, 
           count(CASE WHEN raw_data->>'image_url' IS NOT NULL AND raw_data->>'image_url' != '' THEN 1 END) as with_photo
    FROM analog_listings
    WHERE is_active = true
    GROUP BY source
  `);
  console.log('Финальная статистика:', stats);
}

main().catch(console.error);
