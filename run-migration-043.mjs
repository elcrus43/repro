/**
 * Скрипт для применения миграции 043 — добавление колонок latitude и longitude в таблицу properties
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: VITE_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY не заданы в .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Применяю миграцию 043: добавление колонок latitude и longitude в properties...\n');

  // Прямой запрос через rpc exec_sql
  const { error } = await supabase.rpc('exec_sql', {
    query: 'ALTER TABLE properties ADD COLUMN IF NOT EXISTS latitude NUMERIC, ADD COLUMN IF NOT EXISTS longitude NUMERIC;'
  });

  if (error) {
    // Если exec_sql недоступен — пробуем через прямой insert/select
    console.warn(`⚠️  exec_sql недоступен: ${error.message}`);
    console.log('🔄 Проверяю колонки через прямой запрос...');

    // Проверим, что колонки уже существуют
    const { data, error: checkErr } = await supabase
      .from('properties')
      .select('latitude, longitude')
      .limit(1);

    if (checkErr) {
      console.error('❌ Колонки latitude и longitude отсутствуют и миграция не применилась.');
      console.error('   Выполните вручную в Supabase SQL Editor:');
      console.error('   ALTER TABLE properties ADD COLUMN IF NOT EXISTS latitude NUMERIC, ADD COLUMN IF NOT EXISTS longitude NUMERIC;');
      process.exit(1);
    } else {
      console.log('✅ Колонки latitude и longitude уже существуют — миграция не нужна.');
    }
  } else {
    console.log('✅ Колонки latitude и longitude успешно добавлены в таблицу properties!');
  }

  console.log('\n✅ Миграция 043 завершена!');
}

runMigration().catch(err => {
  console.error('❌ Ошибка:', err.message);
  process.exit(1);
});
