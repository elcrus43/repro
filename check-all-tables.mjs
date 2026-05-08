import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hxivaohzugahjyuaahxc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MTcyODEsImV4cCI6MjA4ODA5MzI4MX0.lCMlJwssUfSMzg3JRrzPSlf0P7SqL6URqAo8nGfbEOY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllTables() {
    const tables = ['clients', 'properties', 'requests', 'matches', 'showings', 'tasks', 'pricelist', 'deals', 'profiles'];
    console.log('--- Checking tables ---');
    for (const table of tables) {
        try {
            const { data, error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
            if (error) {
                console.log(`[${table}] ERROR: ${error.code} - ${error.message}`);
            } else {
                console.log(`[${table}] OK (count: ${count})`);
            }
        } catch (e) {
            console.log(`[${table}] CRASH: ${e.message}`);
        }
    }
}

checkAllTables();
