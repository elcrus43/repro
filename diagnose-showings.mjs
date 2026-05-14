/**
 * Диагностика: почему исчезли события за 13 мая
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function diagnose() {
  // Шаг 1: войти как пользователь для проверки RLS
  console.log('📧 Введите email для входа или оставьте пустым для проверки без авторизации\n');
  
  // Проверяем без авторизации (публичные данные)
  const { data: countData, error: countErr, count } = await sb
    .from('showings')
    .select('*', { count: 'exact', head: true });
  
  console.log('📊 Всего строк в showings (без авт.):', count, countErr?.message || '');

  // Все записи без фильтра
  const { data: allShowings, error: allErr } = await sb
    .from('showings')
    .select('id, showing_date, status, event_type, realtor_id')
    .order('showing_date', { ascending: false })
    .limit(50);

  if (allErr) {
    console.error('❌ RLS блокирует:', allErr.message);
  } else {
    console.log('\n📅 Все видимые события:');
    if (allShowings.length === 0) {
      console.log('   ⚠️  ПУСТО — либо нет данных, либо RLS скрывает всё');
    }
    allShowings.forEach(s => {
      console.log(`   ${s.showing_date?.slice(0,16)} | ${s.event_type} | ${s.status} | realtor: ${s.realtor_id?.slice(0,8)}`);
    });

    // Группировка по дате
    const byDate = {};
    allShowings.forEach(s => {
      const d = s.showing_date?.slice(0,10) || 'unknown';
      byDate[d] = (byDate[d] || 0) + 1;
    });
    console.log('\n📈 По датам:');
    Object.entries(byDate).sort().forEach(([d, n]) => console.log(`   ${d}: ${n} событий`));
  }

  // Проверяем что происходило с RLS
  const { data: rls } = await sb.rpc('exec_sql', {
    query: "SELECT schemaname, tablename, policyname, cmd FROM pg_policies WHERE tablename = 'showings'"
  }).catch(() => ({ data: null }));
  
  if (rls) {
    console.log('\n🔐 RLS политики для showings:', JSON.stringify(rls, null, 2));
  }
}

diagnose().catch(e => console.error('Fatal:', e.message));
