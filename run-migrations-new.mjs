/**
 * Скрипт для применения новых миграций (039, 040, 041) в Supabase
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

async function runMigrations() {
  const migrationFiles = [
    './supabase/migrations/039_add_mortgage_column.sql',
    './supabase/migrations/040_add_deal_expenses.sql',
    './supabase/migrations/041_add_mortgage_details.sql'
  ];

  for (const sqlPath of migrationFiles) {
    if (!fs.existsSync(sqlPath)) {
      console.warn(`⚠️ Пропускаю: Файл ${sqlPath} не найден`);
      continue;
    }

    console.log(`\n🚀 Применяю миграцию ${sqlPath}...`);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const queries = sql
      .replace(/\/\*[\s\S]*?\*\/|--.*$/gm, '') 
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 5);

    for (let query of queries) {
      console.log(`\n📝 Выполняю: ${query.substring(0, 50)}...`);
      const { error } = await supabase.rpc('exec_sql', { query_text: query });
      if (error) {
        // Try fallback if query_text is not the parameter name
        const { error: error2 } = await supabase.rpc('exec_sql', { query });
        if (error2) {
            console.warn(`⚠️ Ошибка: ${error2.message}`);
        } else {
            console.log('✅ Успешно (через fallback)');
        }
      } else {
        console.log('✅ Успешно');
      }
    }
  }
  console.log('\n✅ Все новые миграции обработаны!');
}

runMigrations().catch(err => {
  console.error('❌ Ошибка:', err.message);
  process.exit(1);
});
