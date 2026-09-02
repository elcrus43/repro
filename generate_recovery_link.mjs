import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Задайте VITE_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const email = 'alexandrailchugin@gmail.com';

const { data, error } = await supabase.auth.admin.generateLink({
  type: 'recovery',
  email,
});

if (error) {
  console.error('Error generating link:', error.message);
} else {
  console.log('\n✅ Recovery link generated successfully!\n');
  console.log('Email:', email);
  console.log('\nRecovery URL:');
  console.log(data.properties?.action_link || data.action_link || JSON.stringify(data));
}
