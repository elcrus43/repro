import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function safeQuery(queryFn, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await queryFn().abortSignal(controller.signal);
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      console.error('[safeQuery] Error:', e?.message || 'Сетевая ошибка', e);
      return { data: null, error: { message: e?.message || 'Сетевая ошибка', code: 'NETWORK' } };
    }
}

async function test() {
    console.log("Testing safeQuery...");
    const res = await safeQuery(() => supabase.from('clients').select('*').limit(1));
    console.log("Result:", res);
}
test();
