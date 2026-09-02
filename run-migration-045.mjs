/**
 * run-migration-045.mjs — adds google_refresh_token column
 */
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Задайте VITE_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env');
  process.exit(1);
}

const sql = `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;`;

console.log('Running migration 045: adding google_refresh_token...');

// Use Supabase pg endpoint for raw SQL
const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
  method: 'GET',
  headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
});

// Try the sql endpoint via the pg proxy
const sqlRes = await fetch(`${SUPABASE_URL}/pg/query`, {
  method: 'POST',
  headers: {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

console.log('pg/query status:', sqlRes.status);

if (!sqlRes.ok) {
  // Try Supabase's management API
  const mgmtRes = await fetch(
    `https://api.supabase.com/v1/projects/hxivaohzugahjyuaahxc/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  console.log('Management API status:', mgmtRes.status, await mgmtRes.text());
}

// Verify
const verifyRes = await fetch(
  `${SUPABASE_URL}/rest/v1/profiles?select=google_refresh_token&limit=1`,
  {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  }
);
const verifyData = await verifyRes.text();
console.log('Verify status:', verifyRes.status, verifyData.slice(0, 100));

if (verifyRes.ok) {
  console.log('✓ Migration 045 applied successfully');
} else {
  console.error('❌ Column may not exist. Run this SQL manually in Supabase SQL Editor:');
  console.error(sql);
}
