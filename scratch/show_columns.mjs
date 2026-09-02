import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hxivaohzugahjyuaahxc.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  const { data, error } = await supabase.from('showings').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log('Columns in showings:', Object.keys(data[0] || {}));
  }
  
  const { data: dataTasks, error: errTasks } = await supabase.from('tasks').select('*').limit(1);
  if (errTasks) {
    console.error(errTasks);
  } else {
    console.log('Columns in tasks:', Object.keys(dataTasks[0] || {}));
  }
}

run().catch(console.error);
