import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hxivaohzugahjyuaahxc.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  console.log('Checking profiles for refresh tokens...');
  const { data, error } = await supabase
    .from('profiles')
    .select('*');

  if (error) {
    console.error(error);
  } else {
    console.log(data);
  }
}

run().catch(console.error);
