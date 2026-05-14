/**
 * Скрипт для применения миграции 042 — добавление колонки notes в таблицу requests
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
  console.log('🚀 Применяю миграцию 042: добавление колонки notes в requests...\n');

  // Прямой запрос через rpc exec_sql
  const { error } = await supabase.rpc('exec_sql', {
    query: 'ALTER TABLE requests ADD COLUMN IF NOT EXISTS notes TEXT'
  });

  if (error) {
    // Если exec_sql недоступен — пробуем через прямой insert/select
    console.warn(`⚠️  exec_sql недоступен: ${error.message}`);
    console.log('🔄 Проверяю колонку через прямой запрос...');

    // Проверим, что колонка уже существует (могла быть добавлена вручную)
    const { data, error: checkErr } = await supabase
      .from('requests')
      .select('notes')
      .limit(1);

    if (checkErr) {
      console.error('❌ Колонка notes отсутствует и миграция не применилась.');
      console.error('   Выполните вручную в Supabase SQL Editor:');
      console.error('   ALTER TABLE requests ADD COLUMN IF NOT EXISTS notes TEXT;');
      process.exit(1);
    } else {
      console.log('✅ Колонка notes уже существует — миграция не нужна.');
    }
  } else {
    console.log('✅ Колонка notes успешно добавлена в таблицу requests!');
  }

  console.log('\n✅ Миграция 042 завершена!');
}

runMigration().catch(err => {
  console.error('❌ Ошибка:', err.message);
  process.exit(1);
});
