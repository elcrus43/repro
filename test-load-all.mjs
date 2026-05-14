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
      return { data: null, error: { message: e?.message || 'Сетевая ошибка', code: 'NETWORK' } };
    }
}

async function run() {
    const userId = '1234';
    const isAdmin = true;
    const [clientsRes, propertiesRes, requestsRes, matchesRes] = await Promise.all([
        isAdmin ? safeQuery(() => supabase.from('clients').select('*')) : safeQuery(() => supabase.from('clients').select('*').eq('realtor_id', userId)),
        isAdmin ? safeQuery(() => supabase.from('properties').select('*')) : safeQuery(() => supabase.from('properties').select('*').eq('realtor_id', userId)),
        isAdmin ? safeQuery(() => supabase.from('requests').select('*')) : safeQuery(() => supabase.from('requests').select('*').eq('realtor_id', userId)),
        isAdmin ? safeQuery(() => supabase.from('matches').select('*')) : safeQuery(() => supabase.from('matches').select('*').eq('realtor_id', userId)),
    ]);

    const [showingsRes, tasksRes, priceRes, dealsRes] = await Promise.all([
        isAdmin ? safeQuery(() => supabase.from('showings').select('*')) : safeQuery(() => supabase.from('showings').select('*').eq('realtor_id', userId)),
        isAdmin ? safeQuery(() => supabase.from('tasks').select('*')) : safeQuery(() => supabase.from('tasks').select('*').eq('realtor_id', userId)),
        safeQuery(() => supabase.from('pricelist').select('*')),
        isAdmin ? safeQuery(() => supabase.from('deals').select('*')) : safeQuery(() => supabase.from('deals').select('*').eq('realtor_id', userId)),
    ]);

    const profilesRes = await safeQuery(() => supabase.from('profiles').select('*'));
    
    const errors = [
        clientsRes?.error, propertiesRes?.error, requestsRes?.error, matchesRes?.error,
        showingsRes?.error, tasksRes?.error, priceRes?.error, dealsRes?.error, profilesRes?.error
    ].filter(Boolean);

    console.log("Errors:", errors);
}

run();
