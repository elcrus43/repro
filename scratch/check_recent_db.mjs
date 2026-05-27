import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hxivaohzugahjyuaahxc.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUxNzI4MSwiZXhwIjoyMDg4MDkzMjgxfQ.MBQxRxGfzihFn-aK-7-bGSJ80qoP-jjvU_MxlIH5t8k';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  const realtorId = 'f31f0301-62bf-4821-a625-d3e7a9a2dd7d';

  console.log('=== Active Profiles ===');
  const { data: profile, error: pe } = await supabase.from('profiles').select('id, full_name, role, google_refresh_token').eq('id', realtorId).single();
  if (pe) console.error('Profile fetch error:', pe);
  else console.log('Profile:', profile);

  console.log('\n=== Recent Showings ===');
  const { data: showings, error: se } = await supabase.from('showings')
    .select('id, realtor_id, client_id, property_id, showing_date, status, event_type, google_event_id, created_at')
    .eq('realtor_id', realtorId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (se) console.error('Showings fetch error:', se);
  else console.log('Recent showings:', showings);

  console.log('\n=== Recent Tasks ===');
  const { data: tasks, error: te } = await supabase.from('tasks')
    .select('id, realtor_id, client_id, property_id, title, status, due_date, google_event_id, created_at')
    .eq('realtor_id', realtorId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (te) console.error('Tasks fetch error:', te);
  else console.log('Recent tasks:', tasks);
}

run().catch(console.error);
