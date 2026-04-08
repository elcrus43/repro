import { supabase } from './supabase-config.js';

async function updateProfile() {
    const { data, error } = await supabase
        .from('profiles')
        .update({ role: 'realtor', status: 'approved' })
        .eq('id', 'f31f0301-62bf-4821-a625-d3e7a9a2dd7d')
        .select();

    if (error) {
        console.error('Error updating profile:', error);
    } else {
        console.log('Profile updated successfully:', data);
    }
}

updateProfile();
