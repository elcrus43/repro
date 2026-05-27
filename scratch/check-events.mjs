import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: tasks, error: taskError } = await supabase.from('tasks').select('*');
  if (taskError) {
    console.error('tasks error:', taskError);
  } else {
    console.log('Tasks in DB:');
    tasks.forEach(t => console.log(`- ID: ${t.id}, Title: ${t.title}, Due: ${t.due_date}, Google Event ID: ${t.google_event_id}`));
  }

  const { data: showings, error: showingError } = await supabase.from('showings').select('*');
  if (showingError) {
    console.error('showings error:', showingError);
  } else {
    console.log('\nShowings in DB:');
    showings.forEach(s => console.log(`- ID: ${s.id}, Date: ${s.showing_date}, Google Event ID: ${s.google_event_id}`));
  }
}

check();
