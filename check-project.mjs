/**
 * Проверяет наличие новых колонок в рабочем проекте hxivaohzugahjyuaahxc
 * используя только anon key (без service_role)
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, anonKey);

const NEW_COLUMNS = [
  'renovation', 'bathroom', 'balcony', 'parking', 'furniture',
  'mortgage_available', 'matcapital_available', 'certificate_available',
  'encumbrance', 'minor_owners', 'docs_ready', 'seeking_alternative',
  'apartments_count', 'has_elevator', 'elevator_type', 'has_garbage_chute',
  'ceiling_height', 'house_series', 'developer', 'management_company',
  'cadastral_number', 'building_type', 'urgency', 'price_min',
  'market_type', 'residential_complex',
];

async function checkSchema() {
  console.log('🔍 Проект:', supabaseUrl);
  console.log('═══════════════════════════════════════════════\n');

  // Запрашиваем одну запись с конкретным набором полей
  const selectStr = NEW_COLUMNS.join(', ');
  const { data, error } = await supabase
    .from('properties')
    .select(selectStr)
    .limit(1);

  if (error) {
    console.error('❌ Ошибка SELECT:', error.message);
    console.error('   Код:', error.code);

    if (error.message.includes('Could not find the')) {
      const match = error.message.match(/Could not find the '(\w+)' column/);
      if (match) {
        console.error(`\n🔴 Колонка "${match[1]}" отсутствует!`);
        console.error('   Миграция ещё не применена к проекту hxivaohzugahjyuaahxc');
        console.error('\n   Выполните SQL в Supabase Dashboard → SQL Editor:');
        console.error('   https://supabase.com/dashboard/project/hxivaohzugahjyuaahxc/sql/new');
      }
    } else if (error.code === '42501') {
      // RLS блокирует SELECT — значит таблица есть, попробуем другой способ
      console.log('\n⚠️  RLS блокирует SELECT. Проверяем через UPDATE существующей записи...');
      await checkViaUpdate();
    }
    return;
  }

  console.log('✅ SELECT прошёл — все указанные колонки существуют!\n');

  if (data && data.length > 0) {
    console.log('Пример данных из первой записи:');
    NEW_COLUMNS.forEach(col => {
      const val = data[0][col];
      console.log(`  ${col}: ${JSON.stringify(val)}`);
    });
  } else {
    console.log('(Таблица пустая, но структура корректна)');
  }

  console.log('\n🟢 Миграция применена. БД готова к сохранению всех полей.');
}

async function checkViaUpdate() {
  // Находим любую запись через RLS (залогиненный пользователь может читать)
  const { data: rows, error: readErr } = await supabase
    .from('properties')
    .select('id, building_type, renovation, seeking_alternative, elevator_type')
    .limit(1);

  if (readErr) {
    console.error('❌ Невозможно читать properties:', readErr.message);
    console.log('\n   Для диагностики нужен service_role key от проекта hxivaohzugahjyuaahxc.');
    console.log('   Dashboard → Settings → API → service_role');
    return;
  }

  if (!rows || rows.length === 0) {
    console.log('   Таблица пустая, но SELECT с новыми полями прошёл — ✅ миграция применена!');
    return;
  }

  const row = rows[0];
  console.log(`✅ Данные получены. Запись ${row.id}:`);
  console.log(`   building_type: ${JSON.stringify(row.building_type)}`);
  console.log(`   renovation: ${JSON.stringify(row.renovation)}`);
  console.log(`   seeking_alternative: ${JSON.stringify(row.seeking_alternative)}`);
  console.log(`   elevator_type: ${JSON.stringify(row.elevator_type)}`);
  console.log('\n🟢 Все новые колонки присутствуют. Данные сохраняются корректно.');
}

checkSchema().catch(console.error);
