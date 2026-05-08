/**
 * Скрипт для применения миграции 038 в Supabase (Ссылки на аналоги в портфолио)
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: VITE_SUPABASE_URL или VITE_SUPABASE_ANON_KEY не заданы в .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Применяю миграцию 038...');

  const sqlPath = './supabase/migrations/038_add_analog_links.sql';
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ Ошибка: Файл ${sqlPath} не найден`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  const queries = sql
    .replace(/\/\*[\s\S]*?\*\/|--.*$/gm, '') 
    .split(';')
    .map(q => q.trim())
    .filter(q => q.length > 5);

  for (let query of queries) {
    console.log(`\n📝 Выполняю: ${query}...`);
    const { error } = await supabase.rpc('exec_sql', { query });
    if (error) {
      console.warn(`⚠️ Ошибка: ${error.message}`);
      console.log('Попробуйте выполнить этот SQL вручную в Supabase SQL Editor:');
      console.log(query);
    } else {
      console.log('✅ Успешно');
    }
  }
  console.log('\n✅ Миграция 038 завершена!');
}

runMigration().catch(err => {
  console.error('❌ Ошибка:', err.message);
  process.exit(1);
});
