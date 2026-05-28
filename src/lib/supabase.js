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

const getSupabaseUrl = () => {
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl) {
    return `${envApiUrl}/supabase-proxy`;
  }
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:8000/supabase-proxy`;
    }
  }
  return 'https://hxivaohzugahjyuaahxc.supabase.co';
};

const supabaseUrl = getSupabaseUrl();
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
