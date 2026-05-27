import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hxivaohzugahjyuaahxc.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUxNzI4MSwiZXhwIjoyMDg4MDkzMjgxfQ.MBQxRxGfzihFn-aK-7-bGSJ80qoP-jjvU_MxlIH5t8k';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  const userId = 'f31f0301-62bf-4821-a625-d3e7a9a2dd7d';
  const clientId = 'beae5687-6e51-48b3-92b7-3d29a70a8a7b';
  const propertyId = 'ca98a4b3-5984-4024-935d-2b4ddeca717c';
  
  // We execute a block of SQL that sets the JWT claims to impersonate the user,
  // then performs the insert. If it fails, we catch the Postgres error.
  const query = `
    DO $$
    BEGIN
      -- Set claims to impersonate the user
      PERFORM set_config('request.jwt.claims', json_build_object('sub', '${userId}', 'role', 'authenticated')::text, true);
      
      -- Attempt insert
      INSERT INTO public.showings (
        id, 
        realtor_id, 
        client_id, 
        property_id, 
        showing_date, 
        status, 
        event_type
      ) VALUES (
        '77777777-4444-4444-4444-123456789abc', 
        '${userId}', 
        '${clientId}', 
        '${propertyId}', 
        now(), 
        'planned', 
        'showing'
      );
    END $$;
  `;

  console.log('Running insert under RLS impersonation...');
  const { data, error } = await supabase.rpc('exec_sql', { query });
  
  if (error) {
    console.error('RLS Impersonation Insert Failed:', error);
  } else {
    console.log('RLS Impersonation Insert Succeeded!');
    
    // Clean up
    const cleanQuery = `
      DELETE FROM public.showings WHERE id = '77777777-4444-4444-4444-123456789abc';
    `;
    await supabase.rpc('exec_sql', { query: cleanQuery });
    console.log('Cleaned up impersonated showing.');
  }
}

run().catch(console.error);
