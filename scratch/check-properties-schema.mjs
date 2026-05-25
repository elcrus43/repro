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
  // Let's get column names and types
  const colQuery = `
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'properties'
    ORDER BY ordinal_position;
  `;
  const { data: cols, error: colError } = await supabase.rpc('exec_sql', { query: colQuery });
  if (colError) {
    console.error('Error fetching columns:', colError);
  } else {
    console.log('Columns in properties table:');
    cols.forEach(c => console.log(`  - ${c.column_name} (${c.data_type}) ${c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}${c.column_default ? ' DEFAULT ' + c.column_default : ''}`));
  }

  // Let's get pg_constraint check constraints
  const constQuery = `
    SELECT 
        conname AS constraint_name,
        pg_get_constraintdef(c.oid) AS constraint_definition
    FROM 
        pg_constraint c
    JOIN 
        pg_class t ON c.conrelid = t.oid
    WHERE 
        t.relname = 'properties';
  `;
  const { data: consts, error: constError } = await supabase.rpc('exec_sql', { query: constQuery });
  if (constError) {
    console.error('Error fetching constraints:', constError);
  } else {
    console.log('\nConstraints on properties table:');
    consts.forEach(c => console.log(`  - ${c.constraint_name}: ${c.constraint_definition}`));
  }
}

run();
