/**
 * auth.js — Unified Authentication Layer
 *
 * Переключается между Supabase Auth, Firebase Auth и Neon Auth
 * в зависимости от VITE_BACKEND.
 *
 * При VITE_BACKEND=firebase использует firebaseRestAuth — клиент на базе REST API
 * через Vercel-прокси (/api/firebase-auth), что позволяет работать в России,
 * где Firebase/Google заблокированы.
 *
 * При VITE_BACKEND=neon использует neonAuthService — клиент на базе /api/neon-auth,
 * который хранит пользователей в таблице profiles с bcrypt-хэшем пароля.
 *
 * Экспортирует единый интерфейс, совместимый с кодом приложения.
 */

import { firebaseRestAuth } from './firebaseRestAuth';
import { neonAuthService } from './neonAuth';

const backend = import.meta.env.VITE_BACKEND || 'neon';
const isFirebase    = backend === 'firebase';
const isLocalStorage = backend === 'localstorage';

/** Маппинг пользователя firebaseRestAuth в формат Supabase-совместимого user */
function mapFbUser(user) {
  if (!user) return null;
  return {
    id: user.uid,
    email: user.email,
    user_metadata: {
      full_name: user.displayName || '',
      name:      user.displayName || '',
      phone:     user.phoneNumber || '',
    }
  };
}

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
    if (isFirebase) {
      const { data, error } = await firebaseRestAuth.signInWithPassword({ email, password });
      if (error) return { data: { user: null }, error };
      return { data: { user: mapFbUser(data.user) }, error: null };
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
    if (isFirebase) {
      const { data, error } = await firebaseRestAuth.signUp({ email, password });
      if (error) return { data: { user: null }, error };
      return { data: { user: mapFbUser(data.user) }, error: null };
    }
    return neonAuthService.signUp({ email, password, fullName });
  },

  async resetPasswordForEmail(email, _options = {}) {
    if (isLocalStorage) {
      return { error: null };
    }
    if (isFirebase) {
      return firebaseRestAuth.resetPasswordForEmail(email);
    }
    return neonAuthService.resetPasswordForEmail(email, _options);
  },

  async updateUser({ password }) {
    if (isLocalStorage) {
      return { error: null };
    }
    if (isFirebase) {
      const { error } = await firebaseRestAuth.updatePassword(password);
      return { error };
    }
    return neonAuthService.updateUser({ password });
  },

  async signOut() {
    if (isLocalStorage) {
      localStorage.setItem('repro_local_session', 'false');
      return { error: null };
    }
    if (isFirebase) {
      return firebaseRestAuth.signOut();
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
    if (isFirebase) {
      const { data, error } = await firebaseRestAuth.getSession();
      if (error || !data.session) return { data: { session: null }, error };
      return {
        data: {
          session: {
            user:         mapFbUser(data.session.user),
            access_token: data.session.access_token,
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
    if (isFirebase) {
      return firebaseRestAuth.onAuthStateChange((event, session) => {
        const mappedSession = session
          ? { ...session, user: mapFbUser(session.user) }
          : null;
        callback(event, mappedSession);
      });
    }
    return neonAuthService.onAuthStateChange(callback);
  },
};
