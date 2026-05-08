import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPortfolioSchema() {
  console.log('🔍 Проверяю колонки портфолио в properties...\n');

  const { data, error } = await supabase
    .from('properties')
    .select('id, mortgage_calc_image, portfolio_new_builds_files, portfolio_resale_files')
    .limit(1);

  if (error) {
    console.log('❌ Ошибка при проверке колонок:');
    console.log(error.message);
    if (error.message.includes('mortgage_calc_image')) console.log('⚠️ mortgage_calc_image ОТСУТСТВУЕТ');
    if (error.message.includes('portfolio_new_builds_files')) console.log('⚠️ portfolio_new_builds_files ОТСУТСТВУЕТ');
    if (error.message.includes('portfolio_resale_files')) console.log('⚠️ portfolio_resale_files ОТСУТСТВУЕТ');
  } else {
    console.log('✅ Все колонки портфолио существуют!');
    console.log('Пример данных:', data[0]);
  }

  console.log('\n🔍 Проверяю колонки в showings...\n');
  const { error: showingError } = await supabase
    .from('showings')
    .select('id, event_type, client_feedback, feedback_comment')
    .limit(1);

  if (showingError) {
    console.log('❌ Ошибка при проверке колонок showings:');
    console.log(showingError.message);
  } else {
    console.log('✅ Все колонки в showings существуют!');
  }
}

checkPortfolioSchema();
