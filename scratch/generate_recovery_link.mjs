import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, serviceKey);

const email = 'alexandrailchugin@gmail.com';

async function run() {
  console.log(`Generating password recovery link for ${email}...`);
  
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email: email,
    options: {
      redirectTo: `${supabaseUrl.replace('https://', 'http://localhost:5173')}/profile` // Or simply direct them to local page
    }
  });

  if (error) {
    console.error('Failed to generate link:', error.message);
  } else {
    console.log('✓ Success!');
    console.log('Action Link:', data.action_link);
  }
}

run().catch(console.error);
