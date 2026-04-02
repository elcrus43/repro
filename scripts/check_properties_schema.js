import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://hxivaohzugahjyuaahxc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MTcyODEsImV4cCI6MjA4ODA5MzI4MX0.lCMlJwssUfSMzg3JRrzPSlf0P7SqL6URqAo8nGfbEOY'
);

async function checkPropertiesSchema() {
    const { data, error } = await supabase.from('properties').select('*').limit(1);
    if (error) {
        console.error('Error fetching properties:', error);
    } else if (data && data.length > 0) {
        console.log('Columns in properties table:', Object.keys(data[0]));
    } else {
        console.log('No properties found. Checking schema via dummy insert...');
        const { error: insertError } = await supabase.from('properties').insert({ address: 'Schema Test' });
        console.log('Insert test error:', insertError?.message);
    }
}

checkPropertiesSchema();
