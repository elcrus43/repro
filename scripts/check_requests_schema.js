import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://hxivaohzugahjyuaahxc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MTcyODEsImV4cCI6MjA4ODA5MzI4MX0.lCMlJwssUfSMzg3JRrzPSlf0P7SqL6URqAo8nGfbEOY'
);

async function checkRequestsSchema() {
    const { data, error } = await supabase.from('requests').select('*').limit(1);
    if (error) {
        console.error('Error fetching requests:', error);
    } else if (data && data.length > 0) {
        console.log('Columns in requests table:', Object.keys(data[0]));
    }
}

checkRequestsSchema();
