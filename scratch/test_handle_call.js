import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hxivaohzugahjyuaahxc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUxNzI4MSwiZXhwIjoyMDg4MDkzMjgxfQ.MBQxRxGfzihFn-aK-7-bGSJ80qoP-jjvU_MxlIH5t8k';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const showing = {
    id: '44444444-5555-6666-7777-888888888888',
    realtor_id: 'f31f0301-62bf-4821-a625-d3e7a9a2dd7d',
    client_id: 'beae5687-6e51-48b3-92b7-3d29a70a8a7b',
    type: 'call',
    date: new Date().toISOString().slice(0, 10),
    notes: 'Звонок клиенту',
    created_at: new Date().toISOString(),
    event_type: 'showing'
  };

  console.log('Inserting showing from handleCall...');
  const res = await supabase.from('showings').insert(showing);
  console.log('Result:', res.status, res.error);
}

run();
