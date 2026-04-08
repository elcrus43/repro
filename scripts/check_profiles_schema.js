import { supabase } from './supabase-config.js';

async function checkProfilesSchema() {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
        console.error('Error fetching profiles:', error);
    } else if (data && data.length > 0) {
        console.log('Columns in profiles table:', Object.keys(data[0]));
    }
}

checkProfilesSchema();
