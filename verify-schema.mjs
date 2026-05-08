import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase.rpc('exec_sql', { 
    query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'portfolio_analog_links';" 
  });

  if (error) {
    console.error('Error fetching schema:', error);
  } else {
    console.log('Column info:', data);
  }
}

checkSchema();
