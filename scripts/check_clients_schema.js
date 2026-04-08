import { supabase } from './supabase-config.js';

async function checkClientsSchema() {
    // We can try to get one row to see the keys
    const { data, error } = await supabase.from('clients').select('*').limit(1);
    if (error) {
        console.error('Error fetching clients:', error);
    } else if (data && data.length > 0) {
        console.log('Columns in clients table:', Object.keys(data[0]));
    } else {
        console.log('No clients found to check columns. Attempting to fetch from information_schema (if permissions allow) or just checking error message details.');
        // If no data, we can try to insert a dummy row with passport_details to see if it fails (confirms it's missing)
        const { error: insertError } = await supabase.from('clients').insert({ full_name: 'Test', passport_details: {} });
        console.log('Insert test error (expected if column missing):', insertError?.message);
    }
}

checkClientsSchema();
