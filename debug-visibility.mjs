import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hxivaohzugahjyuaahxc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MTcyODEsImV4cCI6MjA4ODA5MzI4MX0.lCMlJwssUfSMzg3JRrzPSlf0P7SqL6URqAo8nGfbEOY';
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
