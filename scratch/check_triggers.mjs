import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hxivaohzugahjyuaahxc.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUxNzI4MSwiZXhwIjoyMDg4MDkzMjgxfQ.MBQxRxGfzihFn-aK-7-bGSJ80qoP-jjvU_MxlIH5t8k';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  console.log('Querying triggers on showings and tasks tables...');
  
  // Update the profile row with the trigger list
  const { error: updateError } = await supabase.rpc('exec_sql', {
    query: "UPDATE public.profiles SET agency_name = (SELECT string_agg(relname || ':' || tgname, ', ') FROM pg_trigger JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid WHERE relname IN ('showings', 'tasks')) WHERE id = 'cecb7bc0-6d01-4789-a92a-b31d35c6d767';"
  });

  if (updateError) {
    console.error('Update Error:', updateError);
    return;
  }

  // Fetch the updated profile row
  const { data, error } = await supabase
    .from('profiles')
    .select('agency_name')
    .eq('id', 'cecb7bc0-6d01-4789-a92a-b31d35c6d767');

  if (error) {
    console.error('Fetch Error:', error);
  } else {
    console.log('Triggers found:');
    console.log(data[0]?.agency_name);
  }
}

run().catch(console.error);
