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

async function run() {
  const query = `
    SELECT
        tc.table_name, 
        tc.constraint_name, 
        tc.constraint_type,
        cc.check_clause
    FROM 
        information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc
        ON tc.constraint_name = cc.constraint_name
    WHERE 
        tc.table_name IN ('properties', 'requests');
  `;
  const { data, error } = await supabase.rpc('exec_sql', { query });
  if (error) {
    console.error('Error running query:', error);
  } else {
    console.log('Check constraints:', JSON.stringify(data, null, 2));
  }
}

run();
