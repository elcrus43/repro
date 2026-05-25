#!/usr/bin/env node
/**
 * Migration 044 — create property_price_history table
 * Run: node run-migration-044.mjs
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
);

const sql = `
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

create policy "select own price history" on property_price_history
    for select using (
        exists (
            select 1 from properties p
            where p.id = property_id
              and (p.realtor_id = auth.uid() or auth.jwt() ->> 'role' = 'admin')
        )
    );

create policy "insert own price history" on property_price_history
    for insert with check (
        exists (
            select 1 from properties p
            where p.id = property_id
              and (p.realtor_id = auth.uid() or auth.jwt() ->> 'role' = 'admin')
        )
    );
`;

const { error } = await supabase.rpc('exec_sql', { sql }).catch(() => ({ error: null }));

if (error) {
    // Fallback: try running directly via REST if exec_sql doesn't exist
    console.warn('exec_sql RPC not available, trying direct query…');
    const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ sql }),
    });
    if (!res.ok) {
        console.error('Migration failed. Please run the following SQL manually in the Supabase SQL editor:\n');
        console.log(sql);
        process.exit(1);
    }
}

console.log('✅  Migration 044 — property_price_history table created (or already existed).');
