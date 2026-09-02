import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hxivaohzugahjyuaahxc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: clients } = await supabase.from('clients').select('*').limit(3);
  console.log('--- CLIENTS ---');
  clients.forEach(c => console.log(c.id, c.full_name));

  const { data: properties } = await supabase.from('properties').select('*').limit(3);
  console.log('--- PROPERTIES ---');
  properties.forEach(p => console.log(p.id, p.address));
}

run();
