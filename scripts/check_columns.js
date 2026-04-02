import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://hxivaohzugahjyuaahxc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MTcyODEsImV4cCI6MjA4ODA5MzI4MX0.lCMlJwssUfSMzg3JRrzPSlf0P7SqL6URqAo8nGfbEOY'
);

async function checkColumns() {
    const { data: cData } = await supabase.from('clients').select('*').limit(1);
    console.log('Columns in clients table:', Object.keys(cData?.[0] || {}));
    
    const { data: pData } = await supabase.from('properties').select('*').limit(1);
    console.log('Columns in properties table:', Object.keys(pData?.[0] || {}));
}
checkColumns();
