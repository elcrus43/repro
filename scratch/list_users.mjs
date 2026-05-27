import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hxivaohzugahjyuaahxc.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUxNzI4MSwiZXhwIjoyMDg4MDkzMjgxfQ.MBQxRxGfzihFn-aK-7-bGSJ80qoP-jjvU_MxlIH5t8k';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  console.log('Listing users from auth.users...');
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) console.error(error);
  else {
    users.forEach(u => {
      console.log(`- ID: ${u.id} | Email: ${u.email} | Created: ${u.created_at}`);
    });
  }
}

run().catch(console.error);
