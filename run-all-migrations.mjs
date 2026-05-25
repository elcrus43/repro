import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigrations() {
  console.log('Running migrations...');
  
  const migration044 = `
    create table if not exists property_price_history (
        id          uuid primary key default gen_random_uuid(),
        property_id uuid not null references properties(id) on delete cascade,
        old_price   numeric,
        new_price   numeric not null,
        changed_at  timestamptz not null default now(),
        changed_by  uuid references auth.users(id)
    );

    create index if not exists idx_pph_property_id on property_price_history(property_id);

    -- RLS: only allow row reads for the property owner / admin
    alter table property_price_history enable row level security;

    drop policy if exists "select own price history" on property_price_history;
    create policy "select own price history" on property_price_history
        for select using (
            exists (
                select 1 from properties p
                where p.id = property_id
                  and (p.realtor_id = auth.uid() or auth.jwt() ->> 'role' = 'admin')
            )
        );

    drop policy if exists "insert own price history" on property_price_history;
    create policy "insert own price history" on property_price_history
        for insert with check (
            exists (
                select 1 from properties p
                where p.id = property_id
                  and (p.realtor_id = auth.uid() or auth.jwt() ->> 'role' = 'admin')
            )
        );
  `;

  const migration045 = `
    alter table clients add column if not exists public_token uuid default gen_random_uuid();
  `;

  // Run 044
  try {
    const { data: d1, error: e1 } = await supabase.rpc('exec_sql', { query: migration044 });
    if (e1) {
      // Try 'sql' param instead of 'query'
      const { data: d1_2, error: e1_2 } = await supabase.rpc('exec_sql', { sql: migration044 });
      if (e1_2) throw e1_2;
      console.log('✅ Migration 044 applied');
    } else {
      console.log('✅ Migration 044 applied');
    }
  } catch (err) {
    console.error('❌ Migration 044 failed:', err.message || err);
  }

  // Run 045
  try {
    const { data: d2, error: e2 } = await supabase.rpc('exec_sql', { query: migration045 });
    if (e2) {
      const { data: d2_2, error: e2_2 } = await supabase.rpc('exec_sql', { sql: migration045 });
      if (e2_2) throw e2_2;
      console.log('✅ Migration 045 applied');
    } else {
      console.log('✅ Migration 045 applied');
    }
  } catch (err) {
    console.error('❌ Migration 045 failed:', err.message || err);
  }
}

runMigrations();
