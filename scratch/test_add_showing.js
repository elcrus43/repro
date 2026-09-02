import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hxivaohzugahjyuaahxc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const showing = {
    id: '22222222-3333-4444-5555-666666666666',
    realtor_id: 'f31f0301-62bf-4821-a625-d3e7a9a2dd7d',
    showing_date: new Date().toISOString(),
    event_type: 'showing',
    status: 'planned',
    client_id: 'beae5687-6e51-48b3-92b7-3d29a70a8a7b',
    property_id: 'ca98a4b3-5984-4024-935d-2b4ddeca717c',
    client_ids: ['beae5687-6e51-48b3-92b7-3d29a70a8a7b']
  };

  const task = {
    id: '33333333-4444-5555-6666-777777777777',
    realtor_id: showing.realtor_id,
    client_id: showing.client_id,
    property_id: showing.property_id,
    title: `Р СџР С•Р С”Р В°Р В·: ${new Date(showing.showing_date).toLocaleDateString('ru-RU')}`,
    description: `Р СџР В»Р В°Р Р…Р С‘РЎР‚РЎС“Р ВµР СРЎвЂ№Р в„– Р С—Р С•Р С”Р В°Р В· Р С•Р В±РЎР‰Р ВµР С”РЎвЂљР В°. Р РЋРЎвЂљР В°РЎвЂљРЎС“РЎРѓ: ${showing.status}`,
    due_date: showing.showing_date,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  console.log('Inserting showing and task...');
  const resShowing = await supabase.from('showings').upsert(showing);
  const resTask = await supabase.from('tasks').upsert(task);

  console.log('Showing insert result:', resShowing.status, resShowing.error);
  console.log('Task insert result:', resTask.status, resTask.error);

  // Clean up
  await supabase.from('showings').delete().eq('id', showing.id);
  await supabase.from('tasks').delete().eq('id', task.id);
  console.log('Cleanup done');
}

run();
