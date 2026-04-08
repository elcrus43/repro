import { supabase } from './supabase-config.js';

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
