import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://hxivaohzugahjyuaahxc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MTcyODEsImV4cCI6MjA4ODA5MzI4MX0.lCMlJwssUfSMzg3JRrzPSlf0P7SqL6URqAo8nGfbEOY'
);

async function checkTasksColumns() {
    console.log('Checking for google_event_id column in tasks table...');
    const { error } = await supabase
        .from('tasks')
        .select('google_event_id')
        .limit(1);
    
    if (error) {
        if (error.code === '42703' || error.message?.includes('column "google_event_id" does not exist')) {
            console.log('Error: column "google_event_id" DOES NOT exist in tasks table.');
        } else {
            console.error('Unexpected error:', error);
        }
    } else {
        console.log('Success: column "google_event_id" EXISTS in tasks table.');
    }
}
checkTasksColumns();
