import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://hxivaohzugahjyuaahxc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MTcyODEsImV4cCI6MjA4ODA5MzI4MX0.lCMlJwssUfSMzg3JRrzPSlf0P7SqL6URqAo8nGfbEOY'
);

// We need a real realtor ID to test RLS or just check schema
// Use Ельчугин Александр (f31f0301-62bf-4821-a625-d3e7a9a2dd7d)
const REALTOR_ID = 'f31f0301-62bf-4821-a625-d3e7a9a2dd7d';

async function testSave() {
    console.log('--- Testing CLIENT Save ---');
    const clientData = {
        id: crypto.randomUUID(),
        realtor_id: REALTOR_ID,
        full_name: 'Test Client ' + new Date().getTime(),
        phone: '79000000000',
        status: 'active',
        passport_details: { series: '1234', number: '567890' }
    };

    const clientRes = await supabase.from('clients').insert(clientData);
    if (clientRes.error) {
        console.error('CLIENT Save Error:', JSON.stringify(clientRes.error, null, 2));
    } else {
        console.log('CLIENT Save Success!');
    }

    console.log('\n--- Testing PROPERTY Save ---');
    const propData = {
        id: crypto.randomUUID(),
        realtor_id: REALTOR_ID,
        status: 'active',
        property_type: 'apartment',
        market_type: 'secondary',
        city: 'Киров',
        address: 'Тестовая ул., 1',
        price: 3000000,
        rooms: 1,
        area_total: 35
    };

    const propRes = await supabase.from('properties').insert(propData);
    if (propRes.error) {
        console.error('PROPERTY Save Error:', JSON.stringify(propRes.error, null, 2));
    } else {
        console.log('PROPERTY Save Success!');
    }
}

testSave();
