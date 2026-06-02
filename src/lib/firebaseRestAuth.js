/**
 * firebaseRestAuth.js — Firebase Auth через REST API + прокси
 *
 * Полная замена Firebase Auth SDK для работы в условиях блокировки:
 * все запросы идут через Vercel Serverless Functions (/api/firebase-auth, /api/firebase-token),
 * которые уже из незаблокированной среды обращаются к Firebase.
 *
 * Сессия хранится в localStorage. При истечении idToken (1 час) —
 * автоматически обновляется через refreshToken.
 *
 * Экспортирует интерфейс, совместимый с firebase/auth SDK.
 */

const STORAGE_KEY = 'fb_session';

// Базовый URL прокси (относительный — работает и на dev, и на prod)
const AUTH_PROXY  = '/api/firebase-auth';
const TOKEN_PROXY = '/api/firebase-token';

// ─── Хранилище сессии ─────────────────────────────────────────────────────────

function saveSession(session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (_) {}
}

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Вспомогательные ─────────────────────────────────────────────────────────

function isTokenExpired(session) {
  if (!session?.expiresAt) return true;
  // Считаем истёкшим за 5 минут до реального истечения
  return Date.now() > session.expiresAt - 5 * 60 * 1000;
}

function sessionToUser(session) {
  if (!session) return null;
  return {
    uid: session.localId,
    email: session.email,
    displayName: session.displayName || '',
    phoneNumber: session.phoneNumber || '',
  };
}

async function proxyPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { data, ok: res.ok, status: res.status };
}

function parseFirebaseError(errorData) {
  const code = errorData?.error?.message || errorData?.error || 'UNKNOWN_ERROR';
  const map = {
    'EMAIL_NOT_FOUND':        'Неверный email или пароль',
    'INVALID_PASSWORD':       'Неверный email или пароль',
    'INVALID_LOGIN_CREDENTIALS': 'Неверный email или пароль',
    'USER_DISABLED':          'Аккаунт заблокирован',
    'EMAIL_EXISTS':           'Этот email уже используется',
    'WEAK_PASSWORD : Password should be at least 6 characters': 'Слишком слабый пароль (минимум 6 символов)',
    'INVALID_EMAIL':          'Некорректный формат email',
    'TOKEN_EXPIRED':          'Сессия истекла, войдите снова',
    'USER_NOT_FOUND':         'Пользователь не найден',
    'CREDENTIAL_TOO_OLD_LOGIN_AGAIN': 'Требуется повторный вход',
  };
  return map[code] || `Ошибка: ${code}`;
}

// ─── Обновление токена ────────────────────────────────────────────────────────

async function refreshIdToken(session) {
  const { data, ok } = await fetch(TOKEN_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
    }),
  }).then(r => r.json().then(d => ({ data: d, ok: r.ok })));

  if (!ok || data.error) return null;

  const updated = {
    ...session,
    idToken:      data.id_token,
    refreshToken: data.refresh_token,
    expiresAt:    Date.now() + Number(data.expires_in) * 1000,
  };
  saveSession(updated);
  return updated;
}

// ─── Получение актуальной сессии (с авто-обновлением токена) ─────────────────

async function getValidSession() {
  let session = loadSession();
  if (!session) return null;
  if (isTokenExpired(session)) {
    session = await refreshIdToken(session);
  }
  return session;
}

// ─── Слушатели изменения состояния авторизации ───────────────────────────────

const listeners = new Set();

function notifyListeners(user) {
  listeners.forEach(fn => {
    try { fn(user ? 'SIGNED_IN' : 'SIGNED_OUT', user ? { user, access_token: loadSession()?.idToken } : null); }
    catch (_) {}
  });
}

// ─── Основной экспорт ─────────────────────────────────────────────────────────

export const firebaseRestAuth = {
  /**
   * Вход по email/паролю
   * Возвращает: { data: { user }, error: null } | { data: null, error: { message } }
   */
  async signInWithPassword({ email, password }) {
    const { data, ok } = await proxyPost(`${AUTH_PROXY}?action=signInWithPassword`, {
      email,
      password,
      returnSecureToken: true,
    });

    if (!ok || data.error) {
      return { data: { user: null }, error: { message: parseFirebaseError(data) } };
    }

    const session = {
      localId:      data.localId,
      email:        data.email,
      displayName:  data.displayName || '',
      idToken:      data.idToken,
      refreshToken: data.refreshToken,
      expiresAt:    Date.now() + Number(data.expiresIn) * 1000,
    };
    saveSession(session);
    const user = sessionToUser(session);
    notifyListeners(user);
    return { data: { user }, error: null };
  },

  /**
   * Регистрация по email/паролю
   */
  async signUp({ email, password }) {
    const { data, ok } = await proxyPost(`${AUTH_PROXY}?action=signUp`, {
      email,
      password,
      returnSecureToken: true,
    });

    if (!ok || data.error) {
      return { data: { user: null }, error: { message: parseFirebaseError(data) } };
    }

    const session = {
      localId:      data.localId,
      email:        data.email,
      displayName:  '',
      idToken:      data.idToken,
      refreshToken: data.refreshToken,
      expiresAt:    Date.now() + Number(data.expiresIn) * 1000,
    };
    saveSession(session);
    const user = sessionToUser(session);
    notifyListeners(user);
    return { data: { user }, error: null };
  },

  /**
   * Сброс пароля — отправка письма
   */
  async resetPasswordForEmail(email) {
    const { data, ok } = await proxyPost(`${AUTH_PROXY}?action=sendOobCode`, {
      requestType: 'PASSWORD_RESET',
      email,
    });

    if (!ok || data.error) {
      return { error: { message: parseFirebaseError(data) } };
    }
    return { error: null };
  },

  /**
   * Смена пароля (для залогиненного пользователя)
   */
  async updatePassword(newPassword) {
    const session = await getValidSession();
    if (!session) return { error: { message: 'Пользователь не авторизован' } };

    const { data, ok } = await proxyPost(`${AUTH_PROXY}?action=update`, {
      idToken:         session.idToken,
      password:        newPassword,
      returnSecureToken: true,
    });

    if (!ok || data.error) {
      return { error: { message: parseFirebaseError(data) } };
    }

    const updated = {
      ...session,
      idToken:      data.idToken,
      refreshToken: data.refreshToken,
      expiresAt:    Date.now() + Number(data.expiresIn) * 1000,
    };
    saveSession(updated);
    return { error: null };
  },

  /**
   * Выход из системы
   */
  async signOut() {
    clearSession();
    notifyListeners(null);
    return { error: null };
  },

  /**
   * Получение текущей сессии
   */
  async getSession() {
    const session = await getValidSession();
    if (!session) return { data: { session: null }, error: null };

    return {
      data: {
        session: {
          user:         sessionToUser(session),
          access_token: session.idToken,
        }
      },
      error: null,
    };
  },

  /**
   * Подписка на изменение состояния авторизации (аналог onAuthStateChanged)
   * Возвращает объект с методом unsubscribe.
   */
  onAuthStateChange(callback) {
    listeners.add(callback);

    // Немедленно уведомить о текущем состоянии (асинхронно)
    getValidSession().then(session => {
      callback(
        session ? 'SIGNED_IN' : 'SIGNED_OUT',
        session ? { user: sessionToUser(session), access_token: session.idToken } : null
      );
    });

    const unsubscribe = () => listeners.delete(callback);
    return { data: { subscription: { unsubscribe } } };
  },

  /**
   * Получить idToken текущего пользователя (с авто-обновлением)
   */
  async getIdToken() {
    const session = await getValidSession();
    return session?.idToken || null;
  },
};
