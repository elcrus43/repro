import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hxivaohzugahjyuaahxc.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  console.log('--- Showings (Recent 5) ---');
  const { data: showings, error: sErr } = await supabase
    .from('showings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (sErr) console.error(sErr);
  else console.log(showings);

  console.log('--- Tasks (Recent 5) ---');
  const { data: tasks, error: tErr } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (tErr) console.error(tErr);
  else console.log(tasks);
}

run().catch(console.error);
