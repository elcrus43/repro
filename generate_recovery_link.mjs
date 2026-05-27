import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bqixxjsokcjsljdaewth.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxaXh4anNva2Nqc2xqZGFld3RoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjM0MjU0NSwiZXhwIjoyMDYxOTE4NTQ1fQ.HphQILMlGXqJUMstGT3rjMGFPwzNALwUBYExuLYMbRQ';

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
