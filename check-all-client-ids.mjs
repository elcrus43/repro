
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable(tableName) {
  console.log(`\nChecking table: ${tableName}`);
  const { error: insertError } = await supabase
    .from(tableName)
    .insert({ client_ids: [] })
    .select();
  
  if (insertError && insertError.message.includes('client_ids')) {
    console.log(`❌ client_ids column is MISSING in ${tableName}`);
  } else if (!insertError || !insertError.message.includes('client_ids')) {
    console.log(`✅ client_ids column exists in ${tableName} (or other error: ${insertError?.message})`);
  }
}

async function run() {
  await checkTable('properties');
  await checkTable('requests');
  await checkTable('showings');
}

run();
