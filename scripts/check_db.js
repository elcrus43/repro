import { createClient } from '@supabase/supabase-js';

// Use service_role key to access auth.users
const supabase = createClient(
    'https://hxivaohzugahjyuaahxc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MTcyODEsImV4cCI6MjA4ODA5MzI4MX0.lCMlJwssUfSMzg3JRrzPSlf0P7SqL6URqAo8nGfbEOY'
);

async function check() {
    // Check all profiles with their full info
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    if (error) console.error('Error:', error);

    console.log('All profiles:');
    profiles?.forEach(p => {
        console.log(`Name: ${p.full_name} | Role: ${p.role} | Status: ${p.status} | ID: ${p.id}`);
    });

    // The DB shows Alex Elchugin as admin but the live app shows "realtor"
    // This likely means the profile for the Google-auth user isn't tied to yelchugin@gmail.com
    // Let's check what the ADMIN_EMAIL should be vs what email maps to the admin profile
    const adminProfile = profiles?.find(p => p.role === 'admin');
    console.log('\nAdmin profile:', adminProfile);
    console.log('\nNOTE: The ADMIN_EMAIL in AppContext.jsx is yelchugin@gmail.com');
    console.log('If the Google account email is different, the role check will fail.');
    console.log('We need to either: (a) update ADMIN_EMAIL or (b) make the DB role the source of truth');
}
check();
