import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hxivaohzugahjyuaahxc.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUxNzI4MSwiZXhwIjoyMDg4MDkzMjgxfQ.MBQxRxGfzihFn-aK-7-bGSJ80qoP-jjvU_MxlIH5t8k';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function dump() {
  const targetRealtor = 'f31f0301-62bf-4821-a625-d3e7a9a2dd7d';
  
  console.log('--- Profiles ---');
  const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
  if (pError) console.error(pError);
  else console.log(profiles);

  console.log('\n--- Showings ---');
  const { data: showings, error: sError } = await supabase.from('showings').select('*');
  if (sError) console.error(sError);
  else console.log(showings);

  console.log('\n--- Tasks ---');
  const { data: tasks, error: tError } = await supabase.from('tasks').select('*');
  if (tError) console.error(tError);
  else console.log(tasks);

  console.log('\n--- Clients ---');
  const { data: clients, error: cError } = await supabase.from('clients').select('*');
  if (cError) console.error(cError);
  else console.log(clients);
}

dump().catch(console.error);
