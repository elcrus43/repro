/**
 * create-firebase-users.js
 *
 * Импортирует пользователей из Supabase Auth в Firebase Auth с сохранением их оригинальных UID.
 * Это гарантирует, что все связи (realtor_id в объектах, клиентах и т.д.) сохранятся без изменений.
 *
 * Каждому импортированному пользователю задается временный пароль: "repro12345"
 */

import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Загружаем .env вручную ────────────────────────────────────────────────
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
const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Firebase Admin инициализация ───────────────────────────────────────────
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, 'firebase-service-account.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const fbAuth = admin.auth();

async function run() {
  console.log('\n👥 Получаем список пользователей из Supabase Auth...\n');
  const { data: { users: sbUsers }, error: sbError } = await supabase.auth.admin.listUsers();

  if (sbError) {
    console.error('❌ Ошибка Supabase:', sbError.message);
    process.exit(1);
  }

  console.log(`✓ Найдено ${sbUsers.length} пользователей. Начинаем перенос в Firebase Auth...\n`);

  for (const sbUser of sbUsers) {
    const email = sbUser.email;
    const uid = sbUser.id;
    const name = sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || 'Пользователь';

    console.log(`👤 Обработка: ${email} (UID: ${uid})`);

    try {
      // Проверяем, существует ли пользователь в Firebase
      try {
        await fbAuth.getUser(uid);
        console.log(`   ✓ Уже перенесен (UID совпадает)`);
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          // Создаем нового пользователя с тем же UID
          await fbAuth.createUser({
            uid: uid,
            email: email,
            emailVerified: true,
            password: 'repro12345', // Временный пароль
            displayName: name,
          });
          console.log(`   🎉 Создан в Firebase с временным паролем: repro12345`);
        } else {
          throw err;
        }
      }
    } catch (e) {
      console.error(`   ✗ Ошибка при переносе ${email}:`, e.message);
    }
  }

  console.log('\n✅ Перенос пользователей успешно завершен!');
  console.log('Пользователи могут войти со своим Email и паролем: repro12345 (и сменить его в профиле)');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Критическая ошибка:', err);
  process.exit(1);
});
