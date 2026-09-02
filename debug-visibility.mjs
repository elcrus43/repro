import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Задайте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugData() {
    console.log('--- Debugging Data Visibility ---');
    
    // Check session
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Current Session User:', session?.user?.email || 'None');

    // Check all profiles
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
    console.log('Profiles found:', profiles?.length || 0);
    if (profiles) {
        profiles.forEach(p => console.log(` - ${p.email} [${p.role}] status: ${p.status} ID: ${p.id}`));
    }

    // Check properties
    const { data: props, error: prErr } = await supabase.from('properties').select('id, realtor_id, address');
    console.log('Properties found (visible to ANON):', props?.length || 0);
    if (props) {
        props.forEach(p => console.log(` - ${p.address} (realtor: ${p.realtor_id})`));
    }
}

debugData();
