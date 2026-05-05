/**
 * Применяет миграцию 032 через Supabase Management API
 * (не требует exec_sql RPC функции)
 * 
 * Запуск: node apply-migration-032.mjs
 * 
 * Требует SUPABASE_SERVICE_ROLE_KEY или SUPABASE_DB_URL в .env
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Service Role Key имеет права на DDL (ALTER TABLE)
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('❌ Задайте VITE_SUPABASE_URL в .env');
  process.exit(1);
}

// Разбиваем URL для получения project ref
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '').split('.')[0];

async function applyMigration() {
  console.log('🚀 Применяю миграцию 032 через Management API...\n');

  if (!serviceKey) {
    console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY не задан.');
    console.log('   Найти его: Supabase Dashboard → Settings → API → service_role\n');
    printManualSQL();
    return;
  }

  // Попытка через Management API (нужен service_role)
  const alterSQL = `
ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS renovation           text,
    ADD COLUMN IF NOT EXISTS bathroom             text,
    ADD COLUMN IF NOT EXISTS balcony              text,
    ADD COLUMN IF NOT EXISTS parking              text,
    ADD COLUMN IF NOT EXISTS furniture            boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS mortgage_available   boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS matcapital_available boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS certificate_available boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS encumbrance          boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS minor_owners         boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS docs_ready           boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS seeking_alternative  boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS apartments_count     integer,
    ADD COLUMN IF NOT EXISTS has_elevator         boolean,
    ADD COLUMN IF NOT EXISTS elevator_type        text,
    ADD COLUMN IF NOT EXISTS has_garbage_chute    boolean,
    ADD COLUMN IF NOT EXISTS ceiling_height       numeric,
    ADD COLUMN IF NOT EXISTS house_series         text,
    ADD COLUMN IF NOT EXISTS developer            text,
    ADD COLUMN IF NOT EXISTS management_company   text,
    ADD COLUMN IF NOT EXISTS cadastral_number     text,
    ADD COLUMN IF NOT EXISTS building_type        text,
    ADD COLUMN IF NOT EXISTS urgency              text DEFAULT 'medium',
    ADD COLUMN IF NOT EXISTS price_min            numeric,
    ADD COLUMN IF NOT EXISTS market_type          text,
    ADD COLUMN IF NOT EXISTS residential_complex  text;
  `.trim();

  // Используем pg-meta endpoint если доступен
  const metaUrl = `${supabaseUrl}/rest/v1/rpc/query`;
  
  // Метод 1: через прямой HTTP запрос к PostgreSQL через Supabase
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
      body: JSON.stringify({ query: alterSQL }),
    });

    if (response.ok) {
      console.log('✅ Миграция применена успешно!\n');
      await verifyMigration(serviceKey);
      return;
    }

    const err = await response.json();
    console.log(`⚠️  exec_sql RPC недоступен: ${err?.message || response.status}`);
  } catch (e) {
    console.log(`⚠️  Ошибка запроса: ${e.message}`);
  }

  // Метод 2: Через pg-meta (Supabase Studio API)
  console.log('\n   Пробуем через pg-meta...');
  try {
    const pgMetaUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
    const response = await fetch(pgMetaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: alterSQL }),
    });

    if (response.ok) {
      console.log('✅ Миграция применена через pg-meta!\n');
      await verifyMigration(serviceKey);
      return;
    }
    const err = await response.json();
    console.log(`⚠️  pg-meta недоступен: ${JSON.stringify(err).substring(0, 100)}`);
  } catch (e) {
    console.log(`⚠️  pg-meta ошибка: ${e.message}`);
  }

  console.log('\n💡 Автоматическое применение не удалось.');
  printManualSQL();
}

async function verifyMigration(key) {
  const supabase = createClient(supabaseUrl, key);
  
  // Тест INSERT
  const testData = {
    deal_type: 'sale', property_type: 'apartment', city: 'Киров',
    price: 1, floor: 1, floors_total: 5,
    seeking_alternative: true,
    elevator_type: 'passenger',
    building_type: 'panel',
    renovation: 'cosmetic',
  };

  const { data, error } = await supabase.from('properties').insert(testData).select().single();
  
  if (error) {
    console.error('❌ Проверка не прошла:', error.message);
  } else {
    console.log('✅ Проверка: поля сохраняются корректно');
    console.log(`   seeking_alternative: ${data.seeking_alternative}`);
    console.log(`   elevator_type: ${data.elevator_type}`);
    console.log(`   building_type: ${data.building_type}`);
    console.log(`   renovation: ${data.renovation}`);
    // Удаляем тест
    await supabase.from('properties').delete().eq('id', data.id);
  }
}

function printManualSQL() {
  console.log('\n════════════════════════════════════════════════════');
  console.log('ВЫПОЛНИТЕ ЭТОТ SQL В Supabase Dashboard → SQL Editor:');
  console.log('════════════════════════════════════════════════════\n');
  console.log(`ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS renovation           text,
    ADD COLUMN IF NOT EXISTS bathroom             text,
    ADD COLUMN IF NOT EXISTS balcony              text,
    ADD COLUMN IF NOT EXISTS parking              text,
    ADD COLUMN IF NOT EXISTS furniture            boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS mortgage_available   boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS matcapital_available boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS certificate_available boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS encumbrance          boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS minor_owners         boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS docs_ready           boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS seeking_alternative  boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS apartments_count     integer,
    ADD COLUMN IF NOT EXISTS has_elevator         boolean,
    ADD COLUMN IF NOT EXISTS elevator_type        text,
    ADD COLUMN IF NOT EXISTS has_garbage_chute    boolean,
    ADD COLUMN IF NOT EXISTS ceiling_height       numeric,
    ADD COLUMN IF NOT EXISTS house_series         text,
    ADD COLUMN IF NOT EXISTS developer            text,
    ADD COLUMN IF NOT EXISTS management_company   text,
    ADD COLUMN IF NOT EXISTS cadastral_number     text,
    ADD COLUMN IF NOT EXISTS building_type        text,
    ADD COLUMN IF NOT EXISTS urgency              text DEFAULT 'medium',
    ADD COLUMN IF NOT EXISTS price_min            numeric,
    ADD COLUMN IF NOT EXISTS market_type          text,
    ADD COLUMN IF NOT EXISTS residential_complex  text;`);
  console.log('\n════════════════════════════════════════════════════');
  console.log('После применения — запустите снова: node diagnose-properties.mjs');
  console.log('════════════════════════════════════════════════════\n');
}

applyMigration().catch(err => {
  console.error('❌ Ошибка:', err.message);
  process.exit(1);
});
