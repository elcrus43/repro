import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hxivaohzugahjyuaahxc.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MTcyODEsImV4cCI6MjA4ODA5MzI4MX0.lCMlJwssUfSMzg3JRrzPSlf0P7SqL6URqAo8nGfbEOY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tables = [
  'profiles',
  'clients',
  'properties',
  'requests',
  'matches',
  'showings',
  'tasks',
  'pricelist',
  'deals'
];

async function check() {
  console.log('Checking tables...');
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`❌ Table "${table}": ${error.message} (${error.code})`);
    } else {
      console.log(`✅ Table "${table}": OK (${data.length} rows found)`);
    }
  }
}

check().catch(console.error);
