import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a standalone Supabase client to avoid circular dependencies
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export async function logError(error, context = {}) {
  console.error('[App Logger]', error, context);
  if (!supabase) return;

  try {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : null;
    
    let realtorId = null;
    try {
      const userStr = localStorage.getItem('rm_user') || localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        realtorId = user?.id || null;
      }
    } catch (e) {}

    await supabase.from('app_errors').insert({
      realtor_id: realtorId,
      error_message: errorMsg,
      error_stack: errorStack,
      context_data: context
    });
  } catch (e) {
    console.error('Failed to save log to Supabase:', e);
  }
}

export function initGlobalErrorLogging() {
  if (typeof window === 'undefined') return;

  window.onerror = function (message, source, lineno, colno, error) {
    logError(error || new Error(String(message)), {
      type: 'window.onerror',
      source,
      lineno,
      colno
    });
  };

  window.onunhandledrejection = function (event) {
    const reason = event.reason;
    logError(reason instanceof Error ? reason : new Error(String(reason || 'Unhandled rejection')), {
      type: 'window.onunhandledrejection',
      reason: String(reason)
    });
  };
}

