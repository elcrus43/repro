/**
 * Диагностика v2: проверяет структуру БД через information_schema
 * и пробует INSERT+DELETE тестовой записи.
 * 
 * Запуск: node diagnose-properties.mjs
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Задайте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const EXPECTED_COLUMNS = [
  'id', 'realtor_id', 'client_id', 'status', 'property_type', 'market_type',
  'deal_type', 'city', 'address', 'price', 'price_min', 'commission',
  'rooms', 'area_total', 'area_living', 'area_kitchen',
  'floor', 'floors_total', 'build_year',
  'building_type', 'renovation', 'bathroom', 'balcony', 'parking', 'furniture',
  'mortgage_available', 'matcapital_available', 'certificate_available',
  'encumbrance', 'minor_owners', 'docs_ready', 'seeking_alternative',
  'apartments_count', 'has_elevator', 'elevator_type', 'has_garbage_chute',
  'ceiling_height', 'house_series', 'developer', 'management_company',
  'cadastral_number', 'urgency', 'notes', 'images', 'created_at', 'updated_at',
];

async function diagnose() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  ДИАГНОСТИКА БД (v2 — через information_schema)');
  console.log('═══════════════════════════════════════════════════\n');

  // 1. Получаем реальные колонки через information_schema
  console.log('📋 Шаг 1: Запрашиваем колонки через information_schema...');
  const { data: schemaData, error: schemaError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_schema', 'public')
    .eq('table_name', 'properties');

  let actualColumns = [];

  if (schemaError) {
    console.log(`⚠️  information_schema недоступна: ${schemaError.message}`);
    console.log('   Пробуем альтернативный метод — INSERT теста...\n');
  } else if (!schemaData || schemaData.length === 0) {
    console.log('❌ Таблица "properties" НЕ СУЩЕСТВУЕТ в public схеме!');
    console.log('   Нужно выполнить базовую миграцию (031 или 032) в Supabase Dashboard.');
    await testInsert();
    return;
  } else {
    actualColumns = schemaData.map(r => r.column_name);
    console.log(`✅ Найдено ${actualColumns.length} колонок в таблице:\n`);
    schemaData.forEach(r => {
      console.log(`   ${r.column_name.padEnd(28)} ${r.data_type}`);
    });
    console.log('');
  }

  // 2. Сравниваем с ожидаемыми
  if (actualColumns.length > 0) {
    console.log('📋 Шаг 2: Проверяем наличие нужных колонок...\n');
    const missing = EXPECTED_COLUMNS.filter(c => !actualColumns.includes(c));
    const present = EXPECTED_COLUMNS.filter(c => actualColumns.includes(c));

    console.log(`✅ Найдены (${present.length}): ${present.join(', ')}\n`);

    if (missing.length > 0) {
      console.log(`❌ ОТСУТСТВУЮТ (${missing.length}):`);
      missing.forEach(col => console.log(`   - ${col}`));
      console.log('');
    } else {
      console.log('✅ Все ожидаемые колонки присутствуют!\n');
    }
  }

  // 3. Тест INSERT с новыми полями
  await testInsert();
}

async function testInsert() {
  console.log('📋 Тест INSERT с новыми полями...');

  const testRecord = {
    deal_type: 'sale',
    property_type: 'apartment',
    city: 'Киров',
    address: '_ДИАГНОСТИКА_ удалить',
    price: 1,
    floor: 1,
    floors_total: 5,
    build_year: 2000,
    area_total: 40,
    rooms: 2,
    commission: 0,
    // Квартира
    building_type: 'panel',
    renovation: 'cosmetic',
    bathroom: 'separate',
    balcony: 'balcony',
    parking: 'none',
    furniture: false,
    // Условия
    mortgage_available: true,
    matcapital_available: false,
    certificate_available: false,
    encumbrance: false,
    minor_owners: false,
    docs_ready: false,
    seeking_alternative: true,
    // Дом
    has_elevator: true,
    elevator_type: 'passenger',
    has_garbage_chute: false,
    ceiling_height: 2.7,
    house_series: 'П-44',
    developer: 'ТестЗастрой',
    management_company: 'УК Тест',
    apartments_count: 80,
    cadastral_number: '43:00:0000000:1',
    urgency: 'medium',
    notes: null,
    images: [],
  };

  const { data: inserted, error: insertError } = await supabase
    .from('properties')
    .insert(testRecord)
    .select()
    .single();

  if (insertError) {
    console.error(`\n❌ INSERT провалился!`);
    console.error(`   Сообщение: ${insertError.message}`);
    console.error(`   Код: ${insertError.code}`);

    // Детектируем конкретную проблему
    if (insertError.message.includes('Could not find the')) {
      const match = insertError.message.match(/Could not find the '(\w+)' column/);
      if (match) {
        console.error(`\n🔴 ПРИЧИНА: Колонка "${match[1]}" отсутствует в таблице.`);
        console.error('   Выполните миграцию 032 в Supabase Dashboard → SQL Editor');
      }
    } else if (insertError.code === '42P01') {
      console.error('\n🔴 ПРИЧИНА: Таблица properties не существует.');
      console.error('   Выполните миграцию 031 или 032 в Supabase Dashboard → SQL Editor');
    } else if (insertError.code === '42501') {
      console.error('\n🔴 ПРИЧИНА: RLS запрещает INSERT (нет прав).');
      console.error('   Используйте SERVICE_ROLE_KEY вместо ANON_KEY для диагностики.');
    } else if (insertError.code === '23502') {
      console.error('\n🔴 ПРИЧИНА: NOT NULL нарушение — обязательное поле не заполнено.');
    }

    // Пробуем найти нарушающее поле — отправляем минимальный набор
    console.log('\n   Пробуем минимальный INSERT...');
    const minRecord = {
      deal_type: 'sale',
      property_type: 'apartment',
      city: 'Киров',
      address: '_test_',
      price: 1,
      floor: 1,
      floors_total: 5,
    };
    const { error: minError } = await supabase.from('properties').insert(minRecord);
    if (minError) {
      console.error(`   Даже минимальный INSERT провалился: ${minError.message} (${minError.code})`);
    } else {
      console.log('   ✅ Минимальный INSERT прошёл — проблема в новых колонках');
      // Удаляем тестовую запись
      await supabase.from('properties').delete().eq('address', '_test_');
    }

  } else {
    console.log(`✅ INSERT успешен! ID: ${inserted.id}`);
    console.log('\n📋 Проверяем что реально записалось:');

    const checks = [
      ['building_type', 'panel'],
      ['renovation', 'cosmetic'],
      ['bathroom', 'separate'],
      ['balcony', 'balcony'],
      ['furniture', false],
      ['seeking_alternative', true],
      ['elevator_type', 'passenger'],
      ['has_elevator', true],
      ['has_garbage_chute', false],
      ['ceiling_height', 2.7],
      ['house_series', 'П-44'],
      ['developer', 'ТестЗастрой'],
      ['management_company', 'УК Тест'],
      ['apartments_count', 80],
    ];

    const allOk = checks.every(([field, expected]) => {
      const actual = inserted[field];
      // Check for missing field (column doesn't exist → undefined)
      if (actual === undefined) {
        console.log(`   ❌ ${field}: КОЛОНКА ОТСУТСТВУЕТ В ОТВЕТЕ`);
        return false;
      }
      const ok = actual === expected || actual == expected;
      console.log(`   ${ok ? '✅' : '❌'} ${field}: ${JSON.stringify(actual)} ${ok ? '' : `(ожидалось: ${JSON.stringify(expected)})`}`);
      return ok;
    });

    // Удаляем тестовую запись
    await supabase.from('properties').delete().eq('id', inserted.id);
    console.log(`\n🗑  Тестовая запись удалена`);

    console.log('\n═══════════════════════════════════════════════════');
    if (allOk) {
      console.log('🟢 ВЫВОД: Все поля сохраняются корректно!');
      console.log('   Проблема может быть в логике FormPage или dispatcher.');
    } else {
      console.log('🔴 ВЫВОД: Часть полей не сохраняется — нужна миграция.');
      console.log('   Supabase Dashboard → SQL Editor →');
      console.log('   supabase/migrations/032_add_missing_property_fields.sql');
    }
    console.log('═══════════════════════════════════════════════════\n');
  }
}

diagnose().catch(err => {
  console.error('❌ Критическая ошибка:', err.message);
  process.exit(1);
});
