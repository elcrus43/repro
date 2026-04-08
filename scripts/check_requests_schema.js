import { supabase } from './supabase-config.js';

async function checkRequestsSchema() {
    const { data, error } = await supabase.from('requests').select('*').limit(1);
    if (error) {
        console.error('Error fetching requests:', error);
    } else if (data && data.length > 0) {
        console.log('Columns in requests table:', Object.keys(data[0]));
    }
}

checkRequestsSchema();
