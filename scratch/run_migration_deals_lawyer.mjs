import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // We'll try with anon key, but since exec_sql is restricted, we'll see. Wait, actually we can just run the migration or check if it works.

const supabase = createClient(supabaseUrl, supabaseKey);

async function runLawyerMigration() {
  const sql = `ALTER TABLE deals ADD COLUMN IF NOT EXISTS lawyer_id UUID REFERENCES profiles(id);`;
  console.log('Running sql:', sql);
  try {
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) {
      const { data: data2, error: error2 } = await supabase.rpc('exec_sql', { sql });
      if (error2) throw error2;
      console.log('Migration succeeded (sql param):', data2);
    } else {
      console.log('Migration succeeded (query param):', data);
    }
  } catch (err) {
    console.error('Migration failed:', err.message || err);
  }
}

runLawyerMigration();
