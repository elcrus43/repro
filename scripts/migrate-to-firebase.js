/**
 * migrate-to-firebase.js
 *
 * Переносит все данные из Supabase в Firebase Firestore.
 * Запуск: node scripts/migrate-to-firebase.js
 *
 * Требования:
 *   1. Файл scripts/firebase-service-account.json (скачать из Firebase Console)
 *   2. Переменные VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env
 */

import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Загружаем .env вручную (без vite) ─────────────────────────────────────
function loadEnv() {
  const envPath = join(__dirname, '..', '.env');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    env[key.trim()] = rest.join('=').trim();
  }
  return env;
}

const env = loadEnv();

// ── Supabase клиент ────────────────────────────────────────────────────────
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
if (env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('🔑 Используем SUPABASE_SERVICE_ROLE_KEY для обхода RLS');
} else {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY не найден, используем VITE_SUPABASE_ANON_KEY (может вернуть 0 строк)');
}

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  supabaseKey
);

// ── Firebase Admin инициализация ───────────────────────────────────────────
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, 'firebase-service-account.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ── Таблицы для миграции ───────────────────────────────────────────────────
const COLLECTIONS = [
  'clients',
  'properties',
  'requests',
  'matches',
  'showings',
  'deals',
  'tasks',
  'profiles',
  'pricelist',
];

// ── Helpers ────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchFromSupabase(table) {
  const { data, error } = await supabase.from(table).select('*');
  if (error) {
    console.error(`  ✗ Supabase error for '${table}':`, error.message);
    return [];
  }
  return data || [];
}

async function importToFirestore(collectionName, records) {
  if (records.length === 0) {
    console.log(`  ⟳ '${collectionName}': пусто — пропускаем`);
    return 0;
  }

  let count = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const record of records) {
    const { id, ...data } = record;
    if (!id) continue;

    // Очищаем undefined значения (Firestore не принимает undefined)
    const cleanData = JSON.parse(JSON.stringify(data, (_, v) => v === undefined ? null : v));

    const ref = db.collection(collectionName).doc(String(id));
    batch.set(ref, cleanData, { merge: true });
    batchCount++;
    count++;

    // Firestore batch limit = 500 операций
    if (batchCount >= 499) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
      await sleep(100); // небольшая пауза между батчами
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return count;
}

// ── Основная функция миграции ──────────────────────────────────────────────
async function migrate() {
  console.log('\n🚀 Начинаем миграцию Supabase → Firebase Firestore\n');
  console.log(`   Supabase: ${env.VITE_SUPABASE_URL}`);
  console.log(`   Firebase: ${serviceAccount.project_id}\n`);
  console.log('─'.repeat(50));

  const results = {};

  for (const collection of COLLECTIONS) {
    process.stdout.write(`\n📦 '${collection}': загружаем из Supabase...`);
    const records = await fetchFromSupabase(collection);
    process.stdout.write(` ${records.length} записей\n`);

    if (records.length === 0) continue;

    process.stdout.write(`   → пишем в Firestore...`);
    const count = await importToFirestore(collection, records);
    console.log(` ✓ ${count} записей`);

    results[collection] = count;
    await sleep(200); // пауза между коллекциями
  }

  console.log('\n' + '─'.repeat(50));
  console.log('\n✅ Миграция завершена!\n');
  console.log('Итого:');
  for (const [col, count] of Object.entries(results)) {
    console.log(`   ${col}: ${count} записей`);
  }

  console.log('\n📝 Следующие шаги:');
  console.log('   1. Проверьте данные в Firebase Console → Firestore');
  console.log('   2. Измените VITE_BACKEND=firebase в .env');
  console.log('   3. Запустите npm run build и деплойте\n');

  process.exit(0);
}

migrate().catch(err => {
  console.error('\n❌ Ошибка миграции:', err);
  process.exit(1);
});
