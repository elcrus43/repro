import { supabase } from './supabase-config.js';

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
