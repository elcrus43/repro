import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hxivaohzugahjyuaahxc.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUxNzI4MSwiZXhwIjoyMDg4MDkzMjgxfQ.MBQxRxGfzihFn-aK-7-bGSJ80qoP-jjvU_MxlIH5t8k';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  const realtorId = 'f31f0301-62bf-4821-a625-d3e7a9a2dd7d';
  
  // Get a valid client
  const { data: clients } = await supabase.from('clients').select('id').eq('realtor_id', realtorId).limit(1);
  const clientId = clients?.[0]?.id;
  
  // Get a valid property
  const { data: properties } = await supabase.from('properties').select('id').eq('realtor_id', realtorId).limit(1);
  const propertyId = properties?.[0]?.id;

  console.log(`Using Client ID: ${clientId}, Property ID: ${propertyId}`);

  if (!clientId || !propertyId) {
    console.error('Could not find a valid client or property for this realtor.');
    return;
  }

  const showingId = '88888888-4444-4444-4444-123456789abc';
  const taskId = '99999999-4444-4444-4444-123456789abc';

  const showingObj = {
    id: showingId,
    realtor_id: realtorId,
    client_id: clientId,
    client_ids: [clientId],
    property_id: propertyId,
    showing_date: new Date().toISOString(),
    status: 'planned',
    event_type: 'showing',
    client_feedback: '',
    feedback_comment: 'Test comment'
  };

  const taskObj = {
    id: taskId,
    realtor_id: realtorId,
    client_id: clientId,
    property_id: propertyId,
    title: 'Test Showing Task',
    description: 'Test showing task description',
    due_date: new Date().toISOString(),
    priority: 'high',
    status: 'pending'
  };

  console.log('Inserting showing...');
  const sRes = await supabase.from('showings').upsert(showingObj);
  console.log('Showing Insert Result:', sRes.error ? sRes.error : 'Success');

  console.log('Inserting task...');
  const tRes = await supabase.from('tasks').upsert(taskObj);
  console.log('Task Insert Result:', tRes.error ? tRes.error : 'Success');

  // Clean up
  if (!sRes.error) {
    await supabase.from('showings').delete().eq('id', showingId);
    console.log('Cleaned up test showing.');
  }
  if (!tRes.error) {
    await supabase.from('tasks').delete().eq('id', taskId);
    console.log('Cleaned up test task.');
  }
}

run().catch(console.error);
