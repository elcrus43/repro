import { supabase } from './supabase-config.js';

async function check() {
    const { data: profiles } = await supabase.from('profiles').select('*');
    console.log('Profiles in DB:');
    profiles.forEach(p => console.log(`${p.full_name} (${p.id}) -> Role: ${p.role}, Email: ${p.email}`));
}
check();
