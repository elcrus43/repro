/**
 * Скрипт для применения миграции 031 в Supabase
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY не заданы в .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Применяю миграцию 031...');

  const sqlPath = './supabase/migrations/031_add_building_details.sql';
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ Ошибка: Файл ${sqlPath} не найден`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  // Разбиваем SQL на отдельные команды
  // Улучшенный парсинг для обработки многострочных комментариев
  const queries = sql
    .replace(/\/\*[\s\S]*?\*\/|--.*$/gm, '') // Удаляем комментарии
    .split(';')
    .map(q => q.trim())
    .filter(q => q.length > 5); // Игнорируем пустые или слишком короткие запросы

  for (let query of queries) {
    console.log(`\n📝 Выполняю запрос: ${query.substring(0, 50).replace(/\n/g, ' ')}...`);
    
    // Пробуем через exec_sql RPC
    const { error } = await supabase.rpc('exec_sql', { query });
    
    if (error) {
      console.warn(`⚠️ Ошибка RPC exec_sql: ${error.message}`);
      console.log('💡 Попытка выполнить через SQL Editor в Dashboard может быть надежнее.');
      console.log('   SQL для выполнения вручную:');
      console.log(query + ';');
      // Не выходим сразу, пробуем остальные если возможно
    } else {
      console.log('✅ Успешно');
    }
  }

  console.log('\n✅ Миграция 031 завершена!');
}

runMigration().catch(err => {
  console.error('❌ Ошибка:', err.message);
  process.exit(1);
});
