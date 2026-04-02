import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://hxivaohzugahjyuaahxc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MTcyODEsImV4cCI6MjA4ODA5MzI4MX0.lCMlJwssUfSMzg3JRrzPSlf0P7SqL6URqAo8nGfbEOY'
);

async function checkRealtorData() {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name');

    for (const profile of profiles) {
        const { count: clientsCount } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('realtor_id', profile.id);
        const { count: propsCount } = await supabase.from('properties').select('*', { count: 'exact', head: true }).eq('realtor_id', profile.id);
        const { count: reqsCount } = await supabase.from('requests').select('*', { count: 'exact', head: true }).eq('realtor_id', profile.id);

        console.log(`Realtor: ${profile.full_name} (${profile.id})`);
        console.log(`  Clients: ${clientsCount || 0}`);
        console.log(`  Properties: ${propsCount || 0}`);
        console.log(`  Requests: ${reqsCount || 0}`);
        console.log('---');
    }
}

checkRealtorData();
