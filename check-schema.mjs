// Проверка структуры таблиц Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hxivaohzugahjyuaahxc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MTcyODEsImV4cCI6MjA4ODA5MzI4MX0.lCMlJwssUfSMzg3JRrzPSlf0P7SqL6URqAo8nGfbEOY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  console.log('🔍 Проверяю структуру таблиц...\n');

  const testId1 = 'a0000000-0000-0000-0000-000000000001';
  const testId2 = 'a0000000-0000-0000-0000-000000000002';

  // Пробуем вставить тестового клиента с phone_2
  const { data: clientData, error: clientError } = await supabase
    .from('clients')
    .insert({
      id: testId1,
      full_name: 'Test Check',
      phone: '+7000000000',
      phone_2: '+7000000001',
      client_types: ['buyer'],
      realtor_id: null
    })
    .select()
    .single();

  if (clientError) {
    console.log('❌ Ошибка при вставке клиента с phone_2:');
    console.log(clientError.message);
    if (clientError.message.includes('phone_2')) {
      console.log('\n⚠️ КОЛОНКА phone_2 ОТСУТСТВУЕТ!');
    }
  } else {
    console.log('✅ Колонка phone_2 существует');
    await supabase.from('clients').delete().eq('id', testId1);
  }

  // Проверяем realtor_id в showings
  const { data: showingData, error: showingError } = await supabase
    .from('showings')
    .insert({
      id: testId2,
      match_id: null,
      realtor_id: null,
      status: 'scheduled'
    })
    .select()
    .single();

  if (showingError) {
    console.log('\n❌ Ошибка при вставке показа с realtor_id:');
    console.log(showingError.message);
    if (showingError.message.includes('realtor_id')) {
      console.log('\n⚠️ КОЛОНКА realtor_id ОТСУТСТВУЕТ!');
    }
  } else {
    console.log('✅ Колонка realtor_id в showings существует');
    await supabase.from('showings').delete().eq('id', testId2);
  }

  console.log('\n✅ Проверка завершена');
}

checkSchema();
