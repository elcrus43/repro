/**
 * auth.js — Unified Authentication Layer
 *
 * Переключается между Supabase Auth и Firebase Auth в зависимости от VITE_BACKEND.
 * При VITE_BACKEND=firebase использует firebaseRestAuth — клиент на базе REST API
 * через Vercel-прокси (/api/firebase-auth), что позволяет работать в России,
 * где Firebase/Google заблокированы.
 *
 * Экспортирует единый интерфейс, совместимый с кодом приложения.
 */

import { supabase } from './supabase';
import { firebaseRestAuth } from './firebaseRestAuth';

const isFirebase = import.meta.env.VITE_BACKEND === 'firebase';

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
    if (isFirebase) {
      const { data, error } = await firebaseRestAuth.signInWithPassword({ email, password });
      if (error) return { data: { user: null }, error };
      return { data: { user: mapFbUser(data.user) }, error: null };
    }
    return supabase.auth.signInWithPassword({ email, password });
  },

  async signUp({ email, password }) {
    if (isFirebase) {
      const { data, error } = await firebaseRestAuth.signUp({ email, password });
      if (error) return { data: { user: null }, error };
      return { data: { user: mapFbUser(data.user) }, error: null };
    }
    return supabase.auth.signUp({ email, password });
  },

  async resetPasswordForEmail(email, _options = {}) {
    if (isFirebase) {
      return firebaseRestAuth.resetPasswordForEmail(email);
    }
    return supabase.auth.resetPasswordForEmail(email, _options);
  },

  async updateUser({ password }) {
    if (isFirebase) {
      const { error } = await firebaseRestAuth.updatePassword(password);
      return { error };
    }
    return supabase.auth.updateUser({ password });
  },

  async signOut() {
    if (isFirebase) {
      return firebaseRestAuth.signOut();
    }
    return supabase.auth.signOut();
  },

  async getSession() {
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
    return supabase.auth.getSession();
  },

  onAuthStateChange(callback) {
    if (isFirebase) {
      return firebaseRestAuth.onAuthStateChange((event, session) => {
        const mappedSession = session
          ? { ...session, user: mapFbUser(session.user) }
          : null;
        callback(event, mappedSession);
      });
    }
    return supabase.auth.onAuthStateChange(callback);
  },
};
