import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hxivaohzugahjyuaahxc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUxNzI4MSwiZXhwIjoyMDg4MDkzMjgxfQ.MBQxRxGfzihFn-aK-7-bGSJ80qoP-jjvU_MxlIH5t8k';
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
    title: `Показ: ${new Date(showing.showing_date).toLocaleDateString('ru-RU')}`,
    description: `Планируемый показ объекта. Статус: ${showing.status}`,
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
