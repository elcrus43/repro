import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const sql = neon(process.env.NEON_DATABASE_URL);

async function run() {
  console.log('Running migration 057: adding missing columns...');
  
  await sql.query(`
    ALTER TABLE properties ADD COLUMN IF NOT EXISTS movable_property TEXT;
  `);
  console.log('✓ Added properties.movable_property');

  await sql.query(`ALTER TABLE deal_messages ADD COLUMN IF NOT EXISTS file_url TEXT`);
  await sql.query(`ALTER TABLE deal_messages ADD COLUMN IF NOT EXISTS file_name TEXT`);
  await sql.query(`ALTER TABLE deal_messages ADD COLUMN IF NOT EXISTS file_type TEXT`);
  console.log('✓ Added deal_messages file columns');

  console.log('Migration 057 finished successfully.');
}

run().catch(console.error);
