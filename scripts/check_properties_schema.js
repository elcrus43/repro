import { supabase } from './supabase-config.js';

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
