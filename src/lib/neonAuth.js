/**
 * src/lib/neonAuth.js — Auth сервис для Neon
 *
 * Полностью совместим с интерфейсом существующего authService (src/lib/auth.js).
 * Использует /api/neon-auth (Vercel serverless) для аутентификации.
 * JWT хранится в localStorage под ключом 'neon_session'.
 */

const SESSION_KEY = 'neon_session';
const AUTH_API    = '/api/neon-auth';

/* ─── Callbacks для onAuthStateChange ──────────────────────── */
const _listeners = new Set();

function _notifyListeners(event, session) {
  _listeners.forEach(cb => {
    try { cb(event, session); } catch (e) { console.error('[neonAuth] listener error', e); }
  });
}

/* ─── Session helpers ───────────────────────────────────────── */

function _saveSession(user, session) {
  const data = { user, access_token: session.access_token, expires_at: session.expires_at };
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

function _clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function _loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Проверяем что сессия не истекла
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      _clearSession();
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/* ─── Auth API call ─────────────────────────────────────────── */

async function _authRequest(body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(AUTH_API, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  controller.signal,
    });
    const json = await res.json();
    return json;
  } catch (err) {
    if (err.name === 'AbortError') {
      return { data: null, error: 'Превышено время ожидания (10с)' };
    }
    return { data: null, error: err.message };
  } finally {
    clearTimeout(timeout);
  }
}

/* ─── neonAuthService ───────────────────────────────────────── */

export const neonAuthService = {
  /**
   * Вход по email + password
   * Совместим с Supabase: supabase.auth.signInWithPassword({ email, password })
   */
  async signInWithPassword({ email, password }) {
    const res = await _authRequest({ action: 'login', email, password });

    if (res.error) {
      return { data: { user: null }, error: { message: res.error } };
    }

    const { user, session } = res.data;
    _saveSession(user, session);
    _notifyListeners('SIGNED_IN', { user, access_token: session.access_token });

    return { data: { user }, error: null };
  },

  /**
   * Регистрация нового пользователя
   * Совместим с Supabase: supabase.auth.signUp({ email, password })
   */
  async signUp({ email, password, fullName }) {
    const res = await _authRequest({ action: 'register', email, password, fullName });

    if (res.error) {
      return { data: { user: null }, error: { message: res.error } };
    }

    const { user, session } = res.data;
    _saveSession(user, session);
    _notifyListeners('SIGNED_IN', { user, access_token: session.access_token });

    return { data: { user }, error: null };
  },

  /**
   * Выход из системы
   */
  async signOut() {
    const sessionData = _loadSession();
    if (sessionData?.access_token) {
      // Инвалидируем сессию на сервере (не критично если не удалось)
      _authRequest({ action: 'logout', token: sessionData.access_token }).catch(() => {});
    }
    _clearSession();
    _notifyListeners('SIGNED_OUT', null);
    return { error: null };
  },

  /**
   * Получение текущей сессии
   * Совместим с Supabase: supabase.auth.getSession()
   */
  async getSession() {
    const sessionData = _loadSession();
    if (!sessionData) {
      return { data: { session: null }, error: null };
    }
    return {
      data: {
        session: {
          user:         sessionData.user,
          access_token: sessionData.access_token,
          expires_at:   sessionData.expires_at,
        }
      },
      error: null,
    };
  },

  /**
   * Обновление токена
   */
  async refreshSession() {
    const sessionData = _loadSession();
    if (!sessionData?.access_token) {
      return { data: { session: null }, error: { message: 'No session' } };
    }

    const res = await _authRequest({ action: 'refresh', token: sessionData.access_token });
    if (res.error) {
      _clearSession();
      _notifyListeners('SIGNED_OUT', null);
      return { data: { session: null }, error: { message: res.error } };
    }

    const { user, session } = res.data;
    _saveSession(user, session);
    return { data: { session: { user, access_token: session.access_token } }, error: null };
  },

  /**
   * Подписка на изменения состояния авторизации
   * Совместим с Supabase: supabase.auth.onAuthStateChange(callback)
   */
  onAuthStateChange(callback) {
    _listeners.add(callback);

    // Немедленно уведомляем о текущем состоянии
    const sessionData = _loadSession();
    setTimeout(() => {
      if (sessionData) {
        callback('SIGNED_IN', {
          user:         sessionData.user,
          access_token: sessionData.access_token,
        });
      } else {
        callback('SIGNED_OUT', null);
      }
    }, 0);

    return {
      data: {
        subscription: {
          unsubscribe() {
            _listeners.delete(callback);
          }
        }
      }
    };
  },

  /**
   * Заглушка для resetPasswordForEmail (не реализовано в базовой версии)
   */
  async resetPasswordForEmail(_email, _opts = {}) {
    console.warn('[neonAuth] resetPasswordForEmail not implemented — use admin panel');
    return { error: null };
  },

  /**
   * Смена пароля текущего пользователя
   */
  async updateUser({ password }) {
    const sessionData = _loadSession();
    if (!sessionData?.access_token) {
      return { error: { message: 'Не авторизован' } };
    }

    try {
      const res = await fetch(AUTH_API, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${sessionData.access_token}`
        },
        body: JSON.stringify({ action: 'updatePassword', password }),
      });

      const json = await res.json();
      if (json.error) {
        return { error: { message: json.error } };
      }

      return { error: null };
    } catch (err) {
      return { error: { message: 'Ошибка сети: ' + err.message } };
    }
  },
};

/* ─── Auto-restore session on load ──────────────────────────── */
// При загрузке страницы слушаем событие истечения сессии от neon.js
if (typeof window !== 'undefined') {
  window.addEventListener('neon:session-expired', () => {
    _clearSession();
    _notifyListeners('SIGNED_OUT', null);
  });
}

export default neonAuthService;
