import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = `
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS google_event_id TEXT;
    ALTER TABLE showings ADD COLUMN IF NOT EXISTS google_event_id TEXT;
  `;

  console.log('Applying calendar columns migration...');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) {
      const { data: data2, error: error2 } = await supabase.rpc('exec_sql', { sql: sql });
      if (error2) throw error2;
      console.log('✅ Columns migration applied using sql param');
    } else {
      console.log('✅ Columns migration applied using query param');
    }
  } catch (err) {
    console.error('❌ Migration failed:', err.message || err);
  }
}

run();
