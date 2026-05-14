/**
 * Применяет миграцию 035 (client_ids для свойств/запросов/показов)
 * Запуск: node run-migration-035-fix.mjs
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: VITE_SUPABASE_URL или ключ Supabase не заданы в .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Проверяем наличие колонки через прямой запрос
async function checkColumn(table, column) {
  const { data, error } = await supabase.from(table).select(column).limit(1);
  if (error && error.message?.includes(column)) {
    return false; // колонка отсутствует
  }
  return true; // колонка есть
}

async function main() {
  console.log('🔍 Проверяю наличие колонки client_ids...\n');

  const tables = ['properties', 'requests', 'showings'];
  
  for (const table of tables) {
    const exists = await checkColumn(table, 'client_ids');
    if (exists) {
      console.log(`✅ ${table}.client_ids — уже есть`);
    } else {
      console.log(`❌ ${table}.client_ids — ОТСУТСТВУЕТ`);
      console.log(`\n🚨 НЕОБХОДИМО применить миграцию в Supabase Dashboard SQL Editor:\n`);
      console.log(`alter table ${table} add column if not exists client_ids text[] default '{}';`);
    }
  }

  // Тест записи/чтения client_ids в properties
  console.log('\n📝 Тест записи client_ids в properties...');
  const { data: props, error: propsErr } = await supabase
    .from('properties')
    .select('id, client_ids, client_id')
    .limit(3);
  
  if (propsErr) {
    console.error('❌ Ошибка чтения properties:', propsErr.message);
  } else {
    console.log(`✅ Прочитано ${props?.length} объектов:`);
    props?.forEach(p => {
      console.log(`  id=${p.id?.slice(0,8)} | client_id=${p.client_id?.slice(0,8)} | client_ids=${JSON.stringify(p.client_ids)}`);
    });
  }

  // Тест обновления с массивом
  if (props?.length > 0) {
    const testProp = props[0];
    const testIds = testProp.client_id ? [testProp.client_id] : [];
    console.log(`\n📝 Тест UPDATE client_ids=${JSON.stringify(testIds)} на id=${testProp.id?.slice(0,8)}...`);
    const { error: updateErr } = await supabase
      .from('properties')
      .update({ client_ids: testIds })
      .eq('id', testProp.id);
    
    if (updateErr) {
      console.error('❌ UPDATE провалился:', updateErr.message);
      console.log('\n🚨 РЕШЕНИЕ: выполни в Supabase SQL Editor:');
      console.log('alter table properties add column if not exists client_ids text[] default \'{}\';');
    } else {
      console.log('✅ UPDATE client_ids прошёл успешно!');
    }
  }
}

main().catch(err => {
  console.error('❌ Фатальная ошибка:', err.message);
  process.exit(1);
});
