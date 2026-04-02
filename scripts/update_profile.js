import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://hxivaohzugahjyuaahxc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MTcyODEsImV4cCI6MjA4ODA5MzI4MX0.lCMlJwssUfSMzg3JRrzPSlf0P7SqL6URqAo8nGfbEOY'
);

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
