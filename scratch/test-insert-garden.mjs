import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const dummyProperty = {
    id: '7ba78e6f-44e2-4db2-944d-d7904e578c78',
    deal_type: 'sale',
    property_type: 'garden',
    city: 'Киров',
    price: 500000,
    rooms: 1,
    area_total: 20,
    area_living: 10,
    area_kitchen: 5,
    floor: 1,
    floors_total: 1,
    address: 'Тестовый адрес',
    build_year: 2020,
    realtor_id: 'a0000000-0000-0000-0000-000000000000'
  };

  const { data: profile } = await supabase.from('profiles').select('id').limit(1).single();
  if (profile) {
    dummyProperty.realtor_id = profile.id;
  }

  console.log('Inserting test property without title:', dummyProperty);
  const { data, error } = await supabase.from('properties').insert(dummyProperty).select();
  if (error) {
    console.error('❌ Insert failed:', error);
  } else {
    console.log('✅ Insert succeeded:', data);
    // Delete it afterwards
    await supabase.from('properties').delete().eq('id', dummyProperty.id);
  }
}

testInsert();
