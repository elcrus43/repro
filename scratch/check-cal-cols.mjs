import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { error: taskError } = await supabase.from('tasks').select('google_event_id').limit(1);
  if (taskError) {
    console.error('❌ tasks.google_event_id does not exist or failed:', taskError.message);
  } else {
    console.log('✅ tasks.google_event_id exists');
  }

  const { error: showingError } = await supabase.from('showings').select('google_event_id').limit(1);
  if (showingError) {
    console.error('❌ showings.google_event_id does not exist or failed:', showingError.message);
  } else {
    console.log('✅ showings.google_event_id exists');
  }
}

check();
