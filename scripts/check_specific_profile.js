import { supabase } from './supabase-config.js';

async function checkSpecificProfile() {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', 'f31f0301-62bf-4821-a625-d3e7a9a2dd7d')
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
    } else {
        console.log('Profile details:', profile);
    }
}

checkSpecificProfile();
