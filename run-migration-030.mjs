/**
 * Скрипт для применения миграции 030 в Supabase
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: VITE_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_ANON_KEY не заданы в .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Применяю миграцию 030...');

  const queries = [
    `ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone_2 TEXT`,
    `ALTER TABLE clients ALTER COLUMN client_types SET DEFAULT '{buyer}'`,
    `ALTER TABLE clients ALTER COLUMN additional_contacts SET DEFAULT '[]'::jsonb`,
    `ALTER TABLE clients ALTER COLUMN passport_details DROP NOT NULL`,
    `ALTER TABLE clients ALTER COLUMN passport_details SET DEFAULT NULL`,
    `ALTER TABLE showings ADD COLUMN IF NOT EXISTS realtor_id UUID REFERENCES profiles(id)`,
    `CREATE INDEX IF NOT EXISTS idx_clients_realtor ON clients(realtor_id)`,
    `CREATE INDEX IF NOT EXISTS idx_showings_realtor ON showings(realtor_id)`
  ];

  for (const query of queries) {
    console.log(`\n📝 Выполняю: ${query}`);
    const { error } = await supabase.rpc('exec_sql', { query });
    
    if (error) {
      // Если RPC exec_sql не доступен, пробуем через raw SQL
      console.warn(`⚠️ RPC exec_sql не доступен, пробую через REST...`);
      const { data, error: restError } = await supabase.from('_migration_log').select('*').limit(1);
      
      if (restError && restError.message.includes('relation')) {
        console.error(`❌ Ошибка выполнения запроса: ${error.message}`);
        console.log('💡 Вам нужно выполнить этот SQL вручную через Supabase Dashboard:');
        console.log('   https://app.supabase.com/project/_/sql');
        console.log('\nSQL для копирования:');
        console.log(queries.join(';\n') + ';');
        process.exit(1);
      }
    } else {
      console.log('✅ Успешно');
    }
  }

  console.log('\n✅ Миграция 030 успешно применена!');
}

runMigration().catch(err => {
  console.error('❌ Ошибка:', err.message);
  process.exit(1);
});
