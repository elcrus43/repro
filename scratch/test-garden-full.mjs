/**
 * test-garden-full.mjs
 * Тест вставки сада с теми же полями, что создаёт FormPage + supabaseSync
 * Запускаем через exec_sql чтобы обойти RLS и получить точную ошибку БД
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  // 1. Сначала проверим все колонки
  const colQuery = `
    DO $$
    DECLARE v_cols text;
    BEGIN
      SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) INTO v_cols
      FROM information_schema.columns WHERE table_name = 'properties';
      RAISE EXCEPTION 'COLS: %', v_cols;
    END $$;
  `;
  const { error: colError } = await supabase.rpc('exec_sql', { query: colQuery });
  if (colError) {
    console.log('📋 Все колонки properties:');
    console.log(colError.message.replace('COLS: ', '').split(', ').join('\n  - '));
  }

  // 2. Проверяем конкретные поля которые FormPage отправляет
  const testFieldsQuery = `
    DO $$
    DECLARE
      v_missing text := '';
      v_existing text := '';
    BEGIN
      DECLARE
        field_names text[] := ARRAY[
          'build_year', 'floors_total', 'portfolio_analog_links',
          'portfolio_new_builds_files', 'portfolio_resale_files',
          'portfolio_mortgage_files', 'client_ids', 'seeking_alternative',
          'elevator_type', 'mortgage', 'images', 'latitude', 'longitude'
        ];
        f text;
      BEGIN
        FOREACH f IN ARRAY field_names LOOP
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'properties' AND column_name = f
          ) THEN
            v_existing := v_existing || f || ', ';
          ELSE
            v_missing := v_missing || f || ', ';
          END IF;
        END LOOP;
      END;
      RAISE EXCEPTION 'EXISTS: % | MISSING: %', v_existing, v_missing;
    END $$;
  `;
  const { error: fieldsError } = await supabase.rpc('exec_sql', { query: testFieldsQuery });
  if (fieldsError) {
    console.log('\n✅/❌ Статус полей:');
    console.log(fieldsError.message);
  }

  // 3. Вставляем garden с ПОЛНЫМ набором полей как в FormPage + supabaseSync
  const insertQuery = `
    DO $$
    DECLARE v_realtor_id uuid;
    BEGIN
      SELECT id INTO v_realtor_id FROM profiles LIMIT 1;
      IF v_realtor_id IS NULL THEN
        RAISE EXCEPTION 'No profiles found';
      END IF;

      INSERT INTO properties (
        id, deal_type, property_type, city, price, realtor_id, address,
        floors_total, build_year, district, microdistrict, price_min, notes, images,
        commission, client_ids, client_id, portfolio_analog_links,
        rooms, area_total, area_living, area_kitchen, floor,
        market_type, status, urgency,
        mortgage_available, matcapital_available, encumbrance, minor_owners,
        docs_ready, furniture
      ) VALUES (
        gen_random_uuid(), 'sale', 'garden', 'Киров', 500000, v_realtor_id, 'Тест',
        9, 2020, null, null, null, null, '{}',
        0, '{}', null, '[]',
        1, 20, 0, 0, 1,
        'secondary', 'active', 'medium',
        true, false, false, false,
        false, false
      );
      
      RAISE EXCEPTION 'SUCCESS: garden inserted OK';
    END $$;
  `;
  const { error: insertError } = await supabase.rpc('exec_sql', { query: insertQuery });
  if (insertError) {
    if (insertError.message.includes('SUCCESS')) {
      console.log('\n✅ Вставка сада с полными полями: УСПЕХ');
    } else {
      console.log('\n❌ Вставка сада с полными полями: ОШИБКА');
      console.log(insertError.message);
    }
  }
}

test().catch(console.error);
