/**
 * Supabase клиент для фронтенда.
 *
 * Использует анонимный ключ из переменных окружения Vite.
 * Этот ключ безопасен для клиентского кода — RLS политики
 * на сервере ограничивают доступ к данным.
 *
 * @see https://supabase.com/docs/reference/javascript/initializing
 */
import { createClient } from '@supabase/supabase-js';

// Временное решение: используем прямой URL пока Vite кэширует старые .env значения
// TODO: Вернуть import.meta.env после исправления кэша
const supabaseUrl = 'https://hxivaohzugahjyuaahxc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MTcyODEsImV4cCI6MjA4ODA5MzI4MX0.lCMlJwssUfSMzg3JRrzPSlf0P7SqL6URqAo8nGfbEOY';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] VITE_SUPABASE_URL или VITE_SUPABASE_ANON_KEY не заданы в .env'
  );
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      // Автоматически обновлять сессию
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
