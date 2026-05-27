import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hxivaohzugahjyuaahxc.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUxNzI4MSwiZXhwIjoyMDg4MDkzMjgxfQ.MBQxRxGfzihFn-aK-7-bGSJ80qoP-jjvU_MxlIH5t8k';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  const showing = {
    id: '11111111-2222-3333-4444-555555555555',
    realtor_id: 'f31f0301-62bf-4821-a625-d3e7a9a2dd7d',
    property_id: '14652cdc-0b6d-42ec-83e5-f908cdfd3ab0',
    client_id: 'beae5687-6e51-48b3-92b7-3d29a70a8a7b',
    showing_date: new Date().toISOString(),
    status: 'planned',
    event_type: 'showing',
    client_ids: ['beae5687-6e51-48b3-92b7-3d29a70a8a7b']
  };

  console.log('Testing showing insert...');
  const { data, error } = await supabase.from('showings').insert(showing);

  if (error) {
    console.error('Insert Error:', error);
  } else {
    console.log('Insert Success:', data);
  }

  // Clean up
  await supabase.from('showings').delete().eq('id', showing.id);
}

run().catch(console.error);
