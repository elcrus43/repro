/**
 * auth.js — Unified Authentication Layer
 *
 * Поддерживаемые бэкенды (VITE_BACKEND):
 *   neon         — Neon PostgreSQL через /api/neon-auth (по умолчанию)
 *   localstorage — Локальное хранилище (оффлайн/разработка)
 */

import { neonAuthService } from './neonAuth';

const backend = import.meta.env.VITE_BACKEND || 'neon';
const isLocalStorage = backend === 'localstorage';

export const authService = {
  async signInWithPassword({ email, password }) {
    if (isLocalStorage) {
      localStorage.setItem('repro_local_session', 'true');
      return {
        data: {
          user: {
            id: 'local-user-id',
            email: email || 'local@example.com',
            user_metadata: { full_name: 'Локальный пользователь', name: 'Локальный пользователь', phone: '' }
          }
        },
        error: null
      };
    }
    return neonAuthService.signInWithPassword({ email, password });
  },

  async signUp({ email, password, fullName }) {
    if (isLocalStorage) {
      localStorage.setItem('repro_local_session', 'true');
      return {
        data: {
          user: {
            id: 'local-user-id',
            email: email || 'local@example.com',
            user_metadata: { full_name: 'Локальный пользователь', name: 'Локальный пользователь', phone: '' }
          }
        },
        error: null
      };
    }
    return neonAuthService.signUp({ email, password, fullName });
  },

  async resetPasswordForEmail(email, _options = {}) {
    if (isLocalStorage) {
      return { error: null };
    }
    return neonAuthService.resetPasswordForEmail(email, _options);
  },

  async updateUser({ password }) {
    if (isLocalStorage) {
      return { error: null };
    }
    return neonAuthService.updateUser({ password });
  },

  async signOut() {
    if (isLocalStorage) {
      localStorage.setItem('repro_local_session', 'false');
      return { error: null };
    }
    return neonAuthService.signOut();
  },

  async getSession() {
    if (isLocalStorage) {
      const active = localStorage.getItem('repro_local_session') !== 'false';
      if (!active) return { data: { session: null }, error: null };
      return {
        data: {
          session: {
            user: {
              id: 'local-user-id',
              email: 'local@example.com',
              user_metadata: {
                full_name: 'Локальный пользователь',
                name: 'Локальный пользователь',
                phone: '',
              }
            },
            access_token: 'local-token',
          }
        },
        error: null,
      };
    }
    return neonAuthService.getSession();
  },

  onAuthStateChange(callback) {
    if (isLocalStorage) {
      const active = localStorage.getItem('repro_local_session') !== 'false';
      setTimeout(() => {
        if (active) {
          callback('SIGNED_IN', {
            user: {
              id: 'local-user-id',
              email: 'local@example.com',
              user_metadata: {
                full_name: 'Локальный пользователь',
                name: 'Локальный пользователь',
                phone: '',
              }
            },
            access_token: 'local-token',
          });
        } else {
          callback('SIGNED_OUT', null);
        }
      }, 50);
      return {
        data: {
          subscription: {
            unsubscribe() {}
          }
        }
      };
    }
    return neonAuthService.onAuthStateChange(callback);
  },
};
