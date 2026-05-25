import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const query = `
    DO $$
    DECLARE
      v_cols text;
    BEGIN
      SELECT string_agg(column_name || ' (' || data_type || ')', ', ') INTO v_cols
      FROM information_schema.columns 
      WHERE table_name = 'properties';
      
      RAISE EXCEPTION 'COLUMNS: %', v_cols;
    END $$;
  `;
  const { data, error } = await supabase.rpc('exec_sql', { query });

  if (error) {
    console.log('Result error message:', error.message);
  } else {
    console.log('Column info:', data);
  }
}

checkSchema();
