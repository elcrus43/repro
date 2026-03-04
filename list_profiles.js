import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listProfiles() {
    const { data, error } = await supabase.from('profiles').select('*').limit(5);
    if (error) {
        console.error('Error fetching profiles:', error);
    } else {
        console.log('Profiles:', data);
    }
}

listProfiles();
