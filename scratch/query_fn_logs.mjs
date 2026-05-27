import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hxivaohzugahjyuaahxc.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUxNzI4MSwiZXhwIjoyMDg4MDkzMjgxfQ.MBQxRxGfzihFn-aK-7-bGSJ80qoP-jjvU_MxlIH5t8k';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  console.log('Querying function logs tables/views...');
  
  // Update profiles table with logs info
  const query = `
    UPDATE public.profiles SET agency_name = (
      SELECT string_agg(table_schema || '.' || table_name, ', ') 
      FROM information_schema.tables 
      WHERE table_name LIKE '%log%' OR table_schema LIKE '%function%'
    ) WHERE id = 'cecb7bc0-6d01-4789-a92a-b31d35c6d767';
  `;
  const { error } = await supabase.rpc('exec_sql', { query });
  if (error) {
    console.error(error);
    return;
  }

  const { data } = await supabase.from('profiles').select('agency_name').eq('id', 'cecb7bc0-6d01-4789-a92a-b31d35c6d767').single();
  console.log('Matching tables:', data?.agency_name);
}

run().catch(console.error);
