import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runLawyerTextMigration() {
  const sql = `ALTER TABLE deals ADD COLUMN IF NOT EXISTS lawyer TEXT;`;
  console.log('Running sql:', sql);
  try {
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) {
      const { data: data2, error: error2 } = await supabase.rpc('exec_sql', { sql });
      if (error2) throw error2;
      console.log('Migration succeeded:', data2);
    } else {
      console.log('Migration succeeded:', data);
    }
  } catch (err) {
    console.error('Migration failed:', err.message || err);
  }
}

runLawyerTextMigration();
