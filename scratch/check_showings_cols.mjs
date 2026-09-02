import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hxivaohzugahjyuaahxc.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', {
    query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'showings'"
  });
  if (error) console.error(error);
  else console.log(data);
}

run().catch(console.error);
