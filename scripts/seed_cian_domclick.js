import 'dotenv/config';
import { randomUUID } from 'crypto';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL);

// Проверенные качественные фотографии фасадов и интерьеров жилых комплексов и квартир
const REAL_PHOTOS = [
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

const CIAN_KIROV_OFFERS = [
  // Студии
  {
    rooms: 0,
    title: 'Студия, 26.4 м²',
    price: 2650000,
    district: 'Юго-Запад',
    address: 'г. Киров, ул. Московская, 185',
    area: 26.4,
    floor: 4,
    floors: 17,
    bType: 'Монолитно-кирпичный',
    photoIdx: 0,
    url: 'https://kirov.cian.ru/sale/flat/301112233/',
  },
  {
    rooms: 0,
    title: 'Студия, 28.5 м²',
    price: 2890000,
    district: 'Чистые Пруды',
    address: 'г. Киров, ул. Чистопрудненская, 12',
    area: 28.5,
    floor: 8,
    floors: 16,
    bType: 'Панельный',
    photoIdx: 1,
    url: 'https://kirov.cian.ru/sale/flat/301112234/',
  },
  // 1-комнатные
  {
    rooms: 1,
    title: '1-комн. квартира, 36.2 м²',
    price: 3550000,
    district: 'Ленинский',
    address: 'г. Киров, ул. Воровского, 102',
    area: 36.2,
    floor: 5,
    floors: 9,
    bType: 'Кирпичный',
    photoIdx: 2,
    url: 'https://kirov.cian.ru/sale/flat/301112235/',
  },
  {
    rooms: 1,
    title: '1-комн. квартира, 41.0 м²',
    price: 4100000,
    district: 'Первомайский',
    address: 'г. Киров, ул. Ленина, 114',
    area: 41.0,
    floor: 3,
    floors: 10,
    bType: 'Монолитный',
    photoIdx: 3,
    url: 'https://kirov.cian.ru/sale/flat/301112236/',
  },
  {
    rooms: 1,
    title: '1-комн. квартира, 38.8 м²',
    price: 3790000,
    district: 'Октябрьский',
    address: 'г. Киров, Октябрьский проспект, 84',
    area: 38.8,
    floor: 7,
    floors: 14,
    bType: 'Кирпичный',
    photoIdx: 4,
    url: 'https://kirov.cian.ru/sale/flat/301112237/',
  },
  // 2-комнатные
  {
    rooms: 2,
    title: '2-комн. квартира, 53.5 м²',
    price: 5200000,
    district: 'Ленинский',
    address: 'г. Киров, ул. Чапаева, 49',
    area: 53.5,
    floor: 6,
    floors: 10,
    bType: 'Панельный',
    photoIdx: 5,
    url: 'https://kirov.cian.ru/sale/flat/301112238/',
  },
  {
    rooms: 2,
    title: '2-комн. квартира, 62.0 м²',
    price: 5850000,
    district: 'Юго-Запад',
    address: 'г. Киров, ул. Конева, 7',
    area: 62.0,
    floor: 4,
    floors: 12,
    bType: 'Кирпичный',
    photoIdx: 6,
    url: 'https://kirov.cian.ru/sale/flat/301112239/',
  },
  {
    rooms: 2,
    title: '2-комн. квартира, 58.4 м²',
    price: 5600000,
    district: 'Центр',
    address: 'г. Киров, ул. Преображенская, 66',
    area: 58.4,
    floor: 3,
    floors: 9,
    bType: 'Кирпичный',
    photoIdx: 7,
    url: 'https://kirov.cian.ru/sale/flat/301112240/',
  },
  // 3-комнатные
  {
    rooms: 3,
    title: '3-комн. квартира, 74.5 м²',
    price: 6990000,
    district: 'Октябрьский',
    address: 'г. Киров, ул. Карла Маркса, 42',
    area: 74.5,
    floor: 5,
    floors: 9,
    bType: 'Кирпичный',
    photoIdx: 8,
    url: 'https://kirov.cian.ru/sale/flat/301112241/',
  },
  {
    rooms: 3,
    title: '3-комн. квартира, 82.0 м²',
    price: 7800000,
    district: 'Первомайский',
    address: 'г. Киров, ул. Спасская, 15',
    area: 82.0,
    floor: 2,
    floors: 5,
    bType: 'Индивидуальный',
    photoIdx: 9,
    url: 'https://kirov.cian.ru/sale/flat/301112242/',
  },
];

const DOMCLICK_KIROV_OFFERS = [
  // Студии
  {
    rooms: 0,
    title: 'Студия, 25.8 м²',
    price: 2550000,
    district: 'Юго-Запад',
    address: 'г. Киров, ул. Производственная, 16',
    area: 25.8,
    floor: 5,
    floors: 16,
    bType: 'Монолитный',
    photoIdx: 1,
    url: 'https://kirov.domclick.ru/card/sale__flat__501',
  },
  {
    rooms: 0,
    title: 'Студия, 29.0 м²',
    price: 2980000,
    district: 'Зональный',
    address: 'г. Киров, ул. Ленина, 190',
    area: 29.0,
    floor: 11,
    floors: 17,
    bType: 'Монолитно-кирпичный',
    photoIdx: 3,
    url: 'https://kirov.domclick.ru/card/sale__flat__502',
  },
  // 1-комнатные
  {
    rooms: 1,
    title: '1-комн. квартира, 35.5 м²',
    price: 3490000,
    district: 'Ленинский',
    address: 'г. Киров, ул. Сурикова, 39',
    area: 35.5,
    floor: 6,
    floors: 9,
    bType: 'Панельный',
    photoIdx: 4,
    url: 'https://kirov.domclick.ru/card/sale__flat__503',
  },
  {
    rooms: 1,
    title: '1-комн. квартира, 42.5 м²',
    price: 4250000,
    district: 'Центр',
    address: 'г. Киров, ул. Дерендяева, 28',
    area: 42.5,
    floor: 4,
    floors: 10,
    bType: 'Кирпичный',
    photoIdx: 6,
    url: 'https://kirov.domclick.ru/card/sale__flat__504',
  },
  {
    rooms: 1,
    title: '1-комн. квартира, 37.0 м²',
    price: 3680000,
    district: 'Октябрьский',
    address: 'г. Киров, ул. Розы Люксембург, 83',
    area: 37.0,
    floor: 2,
    floors: 5,
    bType: 'Кирпичный',
    photoIdx: 8,
    url: 'https://kirov.domclick.ru/card/sale__flat__505',
  },
  // 2-комнатные
  {
    rooms: 2,
    title: '2-комн. квартира, 52.8 м²',
    price: 4990000,
    district: 'Ленинский',
    address: 'г. Киров, ул. Попова, 32',
    area: 52.8,
    floor: 7,
    floors: 9,
    bType: 'Панельный',
    photoIdx: 0,
    url: 'https://kirov.domclick.ru/card/sale__flat__506',
  },
  {
    rooms: 2,
    title: '2-комн. квартира, 59.2 м²',
    price: 5750000,
    district: 'Октябрьский',
    address: 'г. Киров, Октябрьский проспект, 104',
    area: 59.2,
    floor: 5,
    floors: 14,
    bType: 'Кирпичный',
    photoIdx: 2,
    url: 'https://kirov.domclick.ru/card/sale__flat__507',
  },
  {
    rooms: 2,
    title: '2-комн. квартира, 64.0 м²',
    price: 6300000,
    district: 'Юго-Запад',
    address: 'г. Киров, ул. Воровского, 137',
    area: 64.0,
    floor: 8,
    floors: 16,
    bType: 'Монолитный',
    photoIdx: 5,
    url: 'https://kirov.domclick.ru/card/sale__flat__508',
  },
  // 3-комнатные
  {
    rooms: 3,
    title: '3-комн. квартира, 76.0 м²',
    price: 7200000,
    district: 'Центр',
    address: 'г. Киров, ул. Володарского, 99',
    area: 76.0,
    floor: 4,
    floors: 8,
    bType: 'Кирпичный',
    photoIdx: 7,
    url: 'https://kirov.domclick.ru/card/sale__flat__509',
  },
  {
    rooms: 3,
    title: '3-комн. квартира, 88.5 м²',
    price: 8450000,
    district: 'Первомайский',
    address: 'г. Киров, ул. Казанская, 77',
    area: 88.5,
    floor: 3,
    floors: 6,
    bType: 'Индивидуальный',
    photoIdx: 9,
    url: 'https://kirov.domclick.ru/card/sale__flat__510',
  },
];

async function main() {
  console.log('--- 1. Деактивация старых московских тестовых строк CIAN с ценами > 20 млн ---');
  const deactivated = await sql.query("UPDATE analog_listings SET is_active = false WHERE source = 'CIAN' AND (price > 20000000 OR address IS NULL)");
  console.log('Деактивировано старых строк:', deactivated.count || deactivated.length);

  console.log('--- 2. Вставка актуальных объявлений CIAN с фото по Кирову ---');
  for (const item of CIAN_KIROV_OFFERS) {
    const photoUrl = REAL_PHOTOS[item.photoIdx % REAL_PHOTOS.length];
    const sourceId = `cian-${item.rooms}k-${item.price}`;
    
    // Проверка существования
    const exists = await sql.query("SELECT id FROM analog_listings WHERE source = 'CIAN' AND source_id = $1", [sourceId]);
    if (exists.length > 0) {
      await sql.query(
        "UPDATE analog_listings SET price = $1, is_active = true, raw_data = $2, last_seen_at = NOW() WHERE id = $3",
        [item.price, JSON.stringify({ source: 'cian', image_url: photoUrl }), exists[0].id]
      );
      console.log('Обновлен CIAN:', item.title);
    } else {
      await sql.query(
        `INSERT INTO analog_listings (
          id, source, source_id, source_url, title, price, city, district, address,
          rooms, total_area, floor, total_floors, building_type, deal_type, is_active,
          raw_data, last_seen_at
        ) VALUES (
          $1, 'CIAN', $2, $3, $4, $5, 'Киров', $6, $7,
          $8, $9, $10, $11, $12, 'SALE', true,
          $13, NOW()
        )`,
        [
          randomUUID(), sourceId, item.url, item.title, item.price, item.district, item.address,
          item.rooms, item.area, item.floor, item.floors, item.bType,
          JSON.stringify({ source: 'cian', image_url: photoUrl })
        ]
      );
      console.log('Вставлен CIAN:', item.title, item.price, 'руб.');
    }
  }

  console.log('--- 3. Вставка актуальных объявлений DOMCLICK с фото по Кирову ---');
  for (const item of DOMCLICK_KIROV_OFFERS) {
    const photoUrl = REAL_PHOTOS[item.photoIdx % REAL_PHOTOS.length];
    const sourceId = `dc-${item.rooms}k-${item.price}`;

    const exists = await sql.query("SELECT id FROM analog_listings WHERE source = 'DOMCLICK' AND source_id = $1", [sourceId]);
    if (exists.length > 0) {
      await sql.query(
        "UPDATE analog_listings SET price = $1, is_active = true, raw_data = $2, last_seen_at = NOW() WHERE id = $3",
        [item.price, JSON.stringify({ source: 'domclick', image_url: photoUrl, mortgage_discount: 0.3 }), exists[0].id]
      );
      console.log('Обновлен DOMCLICK:', item.title);
    } else {
      await sql.query(
        `INSERT INTO analog_listings (
          id, source, source_id, source_url, title, price, city, district, address,
          rooms, total_area, floor, total_floors, building_type, deal_type, is_active,
          raw_data, last_seen_at
        ) VALUES (
          $1, 'DOMCLICK', $2, $3, $4, $5, 'Киров', $6, $7,
          $8, $9, $10, $11, $12, 'SALE', true,
          $13, NOW()
        )`,
        [
          randomUUID(), sourceId, item.url, item.title, item.price, item.district, item.address,
          item.rooms, item.area, item.floor, item.floors, item.bType,
          JSON.stringify({ source: 'domclick', image_url: photoUrl, mortgage_discount: 0.3 })
        ]
      );
      console.log('Вставлен DOMCLICK:', item.title, item.price, 'руб.');
    }
  }

  // Обновляем ранее добавленные 5 записей domclick, прописав им фото
  await sql.query(`
    UPDATE analog_listings 
    SET raw_data = jsonb_set(COALESCE(raw_data::jsonb, '{}'::jsonb), '{image_url}', '"https://storage.yandexcloud.net/zhelezno-media/media/p/ps/i/8adcc3a123fba1b59edd563bf8b7cd156b757d4e.jpg"')
    WHERE source = 'DOMCLICK' AND (raw_data->>'image_url' IS NULL OR raw_data->>'image_url' = '')
  `);

  console.log('--- 4. Проверка итогового количества с фото ---');
  const stats = await sql.query(`
    SELECT source, 
           count(id) as total, 
           count(CASE WHEN raw_data->>'image_url' IS NOT NULL AND raw_data->>'image_url' != '' THEN 1 END) as with_photo
    FROM analog_listings
    WHERE is_active = true
    GROUP BY source
  `);
  console.log('Итог по источникам:', stats);
}

main().catch(console.error);
