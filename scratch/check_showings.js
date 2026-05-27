import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hxivaohzugahjyuaahxc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUxNzI4MSwiZXhwIjoyMDg4MDkzMjgxfQ.MBQxRxGfzihFn-aK-7-bGSJ80qoP-jjvU_MxlIH5t8k';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: showings, error } = await supabase.from('showings').select('*').limit(1);
  if (error) {
    console.error('Error fetching showing columns:', error);
  } else if (showings && showings.length > 0) {
    console.log('Columns in showings table:', Object.keys(showings[0]));
    console.log('Sample showing data:', showings[0]);
  } else {
    console.log('No showings found to inspect');
  }

  // Let's try inserting a test showing for Alexander Elchugin f31f0301-62bf-4821-a625-d3e7a9a2dd7d
  const testShowing = {
    id: '11111111-2222-3333-4444-555555555555',
    realtor_id: 'f31f0301-62bf-4821-a625-d3e7a9a2dd7d',
    showing_date: new Date().toISOString(),
    event_type: 'showing',
    status: 'planned',
    title: 'Тестовый показ',
    description: 'Диагностика',
    client_id: '843e42aa-fdaf-4ff5-b863-d2b656cd595e', // use an existing profile ID or client ID
  };

  console.log('Trying to insert test showing...');
  const { data: inserted, error: insertError } = await supabase.from('showings').insert(testShowing).select();
  if (insertError) {
    console.error('❌ Insert showing failed:', insertError);
  } else {
    console.log('✅ Insert showing succeeded:', inserted);
    // clean up
    await supabase.from('showings').delete().eq('id', testShowing.id);
    console.log('Cleanup done');
  }
}

run();
