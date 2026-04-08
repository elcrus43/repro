/**
 * Конфигурация Supabase для административных скриптов
 * 
 * ИНСТРУКЦИЯ ПО ИСПОЛЬЗОВАНИЮ:
 * 1. Скопируйте .env.example в .env (если ещё не скопировано)
 * 2. Заполните реальные значения в .env:
 *    - SUPABASE_URL=https://your-project-id.supabase.co
 *    - SUPABASE_ANON_KEY=your_anon_key_here
 * 3. Запустите скрипт: node scripts/check_db.js
 * 
 * ВАЖНО: Никогда не коммитьте .env в репозиторий!
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ОШИБКА: Переменные SUPABASE_URL и SUPABASE_ANON_KEY не найдены в .env');
  console.error('📋 Инструкция:');
  console.error('   1. Скопируйте .env.example в .env');
  console.error('   2. Заполните реальные значения из https://app.supabase.com');
  console.error('   3. Запустите скрипт снова');
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
