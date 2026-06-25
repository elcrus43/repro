import { neonDb } from '../lib/neon';

export async function logError(error, context = {}) {
  console.error('[App Logger]', error, context);

  try {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : null;
    
    let realtorId = null;
    try {
      const userStr = localStorage.getItem('rm_user') || localStorage.getItem('user') || localStorage.getItem('neon_session');
      if (userStr) {
        const parsed = JSON.parse(userStr);
        realtorId = parsed?.id || parsed?.user?.id || null;
      }
    } catch {}

    await neonDb.insert('app_errors', {
      realtor_id: realtorId,
      error_message: errorMsg,
      error_stack: errorStack,
      context_data: context
    });
  } catch (e) {
    console.error('Failed to save log to Neon:', e);
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

