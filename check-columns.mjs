
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching property:', error);
    return;
  }

  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log('Columns in properties table:', columns.join(', '));
    
    if (columns.includes('client_ids')) {
      console.log('✅ client_ids column exists');
    } else {
      console.log('❌ client_ids column is MISSING');
    }
  } else {
    console.log('No data found in properties table to inspect columns.');
    // Try to insert and see if it fails
    const { error: insertError } = await supabase
      .from('properties')
      .insert({ client_ids: [] })
      .select();
    
    if (insertError && insertError.message.includes('client_ids')) {
      console.log('❌ client_ids column is MISSING (confirmed by insert error)');
    } else if (!insertError) {
      console.log('✅ client_ids column exists (confirmed by insert success)');
    } else {
      console.log('Could not determine if client_ids exists:', insertError.message);
    }
  }
}

checkColumns();
