import { supabase } from './supabase-config.js';

async function checkColumns() {
    const { data: cData } = await supabase.from('clients').select('*').limit(1);
    console.log('Columns in clients table:', Object.keys(cData?.[0] || {}));
    
    const { data: pData } = await supabase.from('properties').select('*').limit(1);
    console.log('Columns in properties table:', Object.keys(pData?.[0] || {}));
}
checkColumns();
