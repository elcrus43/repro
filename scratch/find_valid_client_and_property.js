import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hxivaohzugahjyuaahxc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUxNzI4MSwiZXhwIjoyMDg4MDkzMjgxfQ.MBQxRxGfzihFn-aK-7-bGSJ80qoP-jjvU_MxlIH5t8k';
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
