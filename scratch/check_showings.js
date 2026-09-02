import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hxivaohzugahjyuaahxc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
    title: 'Р СћР ВµРЎРѓРЎвЂљР С•Р Р†РЎвЂ№Р в„– Р С—Р С•Р С”Р В°Р В·',
    description: 'Р вЂќР С‘Р В°Р С–Р Р…Р С•РЎРѓРЎвЂљР С‘Р С”Р В°',
    client_id: '843e42aa-fdaf-4ff5-b863-d2b656cd595e', // use an existing profile ID or client ID
  };

  console.log('Trying to insert test showing...');
  const { data: inserted, error: insertError } = await supabase.from('showings').insert(testShowing).select();
  if (insertError) {
    console.error('РІСњРЉ Insert showing failed:', insertError);
  } else {
    console.log('РІСљвЂ¦ Insert showing succeeded:', inserted);
    // clean up
    await supabase.from('showings').delete().eq('id', testShowing.id);
    console.log('Cleanup done');
  }
}

run();
