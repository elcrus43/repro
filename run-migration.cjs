const https = require('https');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.');
  console.error('Copy .env.example to .env and fill in your credentials.');
  process.exit(1);
}

const fs = require('fs');
const migration = fs.readFileSync('./supabase/migrations/024_schema_consistency_fix.sql', 'utf8');

// Split migration into individual statements
const statements = migration
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('╔') && !s.startsWith('║') && !s.startsWith('╚') && !s.startsWith('═'));

function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });

    const options = {
      hostname: 'hxivaohzugahjyuaahxc.supabase.co',
      path: '/rest/v1/',
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'params=single-object'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: body });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runMigration() {
  console.log('🚀 Starting migration 024...\n');
  console.log(`📝 Found ${statements.length} SQL statements\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 50).replace(/\n/g, ' ') + (stmt.length > 50 ? '...' : '');

    try {
      const result = await executeSQL(stmt + ';');

      if (result.success) {
        console.log(`✅ [${i + 1}/${statements.length}] ${preview}`);
        successCount++;
      } else {
        const errorMsg = result.error ? JSON.parse(result.error).message || result.error : 'Unknown error';
        if (errorMsg.includes('already exists') || errorMsg.includes('does not exist')) {
          console.log(`ℹ️  [${i + 1}/${statements.length}] ${preview} (skipped)`);
          successCount++;
        } else {
          console.log(`⚠️  [${i + 1}/${statements.length}] ${preview}`);
          console.log(`   ${errorMsg.substring(0, 100)}\n`);
          errorCount++;
        }
      }
    } catch (err) {
      console.log(`❌ [${i + 1}/${statements.length}] ${preview}`);
      console.log(`   ${err.message}\n`);
      errorCount++;
    }
  }

  console.log(`\n✨ Migration complete!`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`⚠️  Errors: ${errorCount}`);
}

runMigration().catch(console.error);
