/**
 * Скрипт для применения миграции 032 в Supabase
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
  console.log('🚀 Применяю миграцию 032...');

  const sqlPath = './supabase/migrations/032_add_missing_property_fields.sql';
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ Ошибка: Файл ${sqlPath} не найден`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  // Разбиваем SQL на отдельные команды
  const queries = sql
    .replace(/\/\*[\s\S]*?\*\/|--.*$/gm, '') // Удаляем комментарии
    .split(';')
    .map(q => q.trim())
    .filter(q => q.length > 5);

  let successCount = 0;
  let failCount = 0;

  for (let query of queries) {
    console.log(`\n📝 Выполняю: ${query.substring(0, 60).replace(/\n/g, ' ')}...`);
    
    const { error } = await supabase.rpc('exec_sql', { query });
    
    if (error) {
      console.warn(`⚠️  RPC exec_sql не работает: ${error.message}`);
      console.log('   Выполните этот SQL вручную в Supabase Dashboard → SQL Editor:');
      console.log('   ' + query.replace(/\n/g, '\n   ') + ';');
      failCount++;
    } else {
      console.log('✅ Успешно');
      successCount++;
    }
  }

  console.log(`\n📊 Результат: ${successCount} успешно, ${failCount} вручную`);
  if (failCount > 0) {
    console.log('\n💡 Если RPC недоступен, скопируйте содержимое файла');
    console.log('   supabase/migrations/032_add_missing_property_fields.sql');
    console.log('   и выполните его в Supabase Dashboard → SQL Editor');
  } else {
    console.log('\n✅ Миграция 032 завершена успешно!');
  }
}

runMigration().catch(err => {
  console.error('❌ Ошибка:', err.message);
  process.exit(1);
});
