import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://hxivaohzugahjyuaahxc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MTcyODEsImV4cCI6MjA4ODA5MzI4MX0.lCMlJwssUfSMzg3JRrzPSlf0P7SqL6URqAo8nGfbEOY'
);

async function checkTriggers() {
    // Query information_schema for triggers (using RPC if available, or just raw query)
    // Since I can't do raw SQL, I'll try to find any RPCs related to maintenance
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_table_triggers', { t_name: 'profiles' });
    if (rpcErr) {
        console.log('RPC get_table_triggers not available.');
    } else {
        console.log('Triggers:', rpcData);
    }

    // Also check RLS policies again
    const { data: policies, error: polErr } = await supabase.rpc('get_policies', { t_name: 'profiles' });
    if (polErr) {
        console.log('RPC get_policies not available.');
    } else {
        console.log('Policies:', policies);
    }
}
checkTriggers();
