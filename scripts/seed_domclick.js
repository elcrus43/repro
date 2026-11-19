import 'dotenv/config';
import { randomUUID } from 'crypto';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL);

const domclickListings = [
  {
    source: 'DOMCLICK',
    source_id: 'dc-101',
    source_url: 'https://kirov.domclick.ru/card/sale__flat__101',
    title: '1-комн. квартира, 38.5 м²',
    price: 3650000,
    city: 'Киров',
    district: 'Ленинский',
    address: 'г. Киров, ул. Воровского, 114',
    rooms: 1,
    total_area: 38.5,
    floor: 5,
    total_floors: 10,
    building_type: 'Кирпичный',
    deal_type: 'SALE',
    is_active: true,
    raw_data: JSON.stringify({ source: 'domclick', mortgage_discount: 0.3 })
  },
  {
    source: 'DOMCLICK',
    source_id: 'dc-102',
    source_url: 'https://kirov.domclick.ru/card/sale__flat__102',
    title: '2-комн. квартира, 54.2 м²',
    price: 5100000,
    city: 'Киров',
    district: 'Октябрьский',
    address: 'г. Киров, Октябрьский проспект, 72',
    rooms: 2,
    total_area: 54.2,
    floor: 4,
    total_floors: 9,
    building_type: 'Панельный',
    deal_type: 'SALE',
    is_active: true,
    raw_data: JSON.stringify({ source: 'domclick', mortgage_discount: 0.3 })
  },
  {
    source: 'DOMCLICK',
    source_id: 'dc-103',
    source_url: 'https://kirov.domclick.ru/card/sale__flat__103',
    title: '3-комн. квартира, 72.0 м²',
    price: 6850000,
    city: 'Киров',
    district: 'Первомайский',
    address: 'г. Киров, ул. Ленина, 85',
    rooms: 3,
    total_area: 72.0,
    floor: 3,
    total_floors: 5,
    building_type: 'Кирпичный',
    deal_type: 'SALE',
    is_active: true,
    raw_data: JSON.stringify({ source: 'domclick', mortgage_discount: 0.3 })
  },
  {
    source: 'DOMCLICK',
    source_id: 'dc-104',
    source_url: 'https://kirov.domclick.ru/card/sale__flat__104',
    title: 'Студия, 28.0 м²',
    price: 2950000,
    city: 'Киров',
    district: 'Юго-Запад',
    address: 'г. Киров, ул. Московская, 171',
    rooms: 0,
    total_area: 28.0,
    floor: 7,
    total_floors: 16,
    building_type: 'Монолитно-кирпичный',
    deal_type: 'SALE',
    is_active: true,
    raw_data: JSON.stringify({ source: 'domclick', mortgage_discount: 0.3 })
  },
  {
    source: 'DOMCLICK',
    source_id: 'dc-105',
    source_url: 'https://kirov.domclick.ru/card/sale__flat__105',
    title: '2-комн. квартира, 60.5 м²',
    price: 5700000,
    city: 'Киров',
    district: 'Зональный',
    address: 'г. Киров, ул. Ленина, 188/3',
    rooms: 2,
    total_area: 60.5,
    floor: 9,
    total_floors: 17,
    building_type: 'Монолитный',
    deal_type: 'SALE',
    is_active: true,
    raw_data: JSON.stringify({ source: 'domclick', mortgage_discount: 0.3 })
  }
];

async function insert() {
  for (const item of domclickListings) {
    const existing = await sql.query('SELECT id FROM analog_listings WHERE source = $1 AND source_id = $2', [item.source, item.source_id]);
    if (existing.length === 0) {
      await sql.query(
        `INSERT INTO analog_listings (
          id, source, source_id, source_url, title, price, city, district, address, rooms,
          total_area, floor, total_floors, building_type, deal_type, is_active, raw_data,
          last_seen_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW()
        )`,
        [
          randomUUID(), item.source, item.source_id, item.source_url, item.title, item.price, item.city,
          item.district, item.address, item.rooms, item.total_area, item.floor, item.total_floors,
          item.building_type, item.deal_type, item.is_active, item.raw_data
        ]
      );
      console.log('Inserted:', item.title);
    } else {
      console.log('Already exists:', item.title);
    }
  }
}

insert().then(() => console.log('Finished inserting Domclick listings')).catch(console.error);
