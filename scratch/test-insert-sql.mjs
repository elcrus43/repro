import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsertSql() {
  // Let's create a temporary function or just query profiles via exec_sql to get a valid realtor_id.
  // Actually, we can get profiles using supabase client since SELECT might be open or we can fetch via RPC.
  // Let's define a function in exec_sql to do the whole insert and return the error or success message.
  const sqlQuery = `
    DO $$
    DECLARE
      v_realtor_id uuid;
    BEGIN
      -- Get any profile ID
      SELECT id INTO v_realtor_id FROM profiles LIMIT 1;
      
      IF v_realtor_id IS NULL THEN
        RAISE EXCEPTION 'No profiles found in the database';
      END IF;

      -- Try to insert
      INSERT INTO properties (
        id, 
        deal_type, 
        property_type, 
        city, 
        price, 
        realtor_id,
        address
      ) VALUES (
        '7ba78e6f-44e2-4db2-944d-d7904e578c79', 
        'sale', 
        'garden', 
        'Киров', 
        500000, 
        v_realtor_id,
        'Тестовый адрес'
      );
      
      -- If successful, delete it immediately
      DELETE FROM properties WHERE id = '7ba78e6f-44e2-4db2-944d-d7904e578c79';
    END $$;
  `;

  console.log('Running test insert via exec_sql...');
  const { data, error } = await supabase.rpc('exec_sql', { query: sqlQuery });
  
  if (error) {
    console.error('❌ SQL Insert failed with database error:', error);
  } else {
    console.log('✅ SQL Insert succeeded! There is no database check constraint blocking garden.');
  }
}

testInsertSql();
