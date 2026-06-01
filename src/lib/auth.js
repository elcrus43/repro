/**
 * auth.js — Unified Authentication Layer
 *
 * Переключается между Supabase Auth и Firebase Auth в зависимости от VITE_BACKEND.
 * Экспортирует единый интерфейс, совместимый с кодом приложения.
 */

import { supabase } from './supabase';
import { db, auth } from './firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword as fbUpdatePassword
} from 'firebase/auth';

const isFirebase = import.meta.env.VITE_BACKEND === 'firebase';

/** Маппинг пользователя Firebase в формат, совместимый с Supabase */
function mapFirebaseUser(user) {
  if (!user) return null;
  return {
    id: user.uid,
    email: user.email,
    user_metadata: {
      full_name: user.displayName || '',
      name: user.displayName || '',
      phone: user.phoneNumber || '',
    }
  };
}

export const authService = {
  async signInWithPassword({ email, password }) {
    if (isFirebase) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { data: { user: mapFirebaseUser(userCredential.user) }, error: null };
      } catch (err) {
        return { data: { user: null }, error: mapAuthError(err) };
      }
    } else {
      return supabase.auth.signInWithPassword({ email, password });
    }
  },

  async signUp({ email, password }) {
    if (isFirebase) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return { data: { user: mapFirebaseUser(userCredential.user) }, error: null };
      } catch (err) {
        return { data: { user: null }, error: mapAuthError(err) };
      }
    } else {
      return supabase.auth.signUp({ email, password });
    }
  },

  async resetPasswordForEmail(email, { redirectTo } = {}) {
    if (isFirebase) {
      try {
        await sendPasswordResetEmail(auth, email);
        return { error: null };
      } catch (err) {
        return { error: mapAuthError(err) };
      }
    } else {
      return supabase.auth.resetPasswordForEmail(email, { redirectTo });
    }
  },

  async updateUser({ password }) {
    if (isFirebase) {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error('Пользователь не найден');
        await fbUpdatePassword(user, password);
        return { error: null };
      } catch (err) {
        return { error: mapAuthError(err) };
      }
    } else {
      return supabase.auth.updateUser({ password });
    }
  },

  async signOut() {
    if (isFirebase) {
      try {
        await fbSignOut(auth);
        return { error: null };
      } catch (err) {
        return { error: mapAuthError(err) };
      }
    } else {
      return supabase.auth.signOut();
    }
  },

  async getSession() {
    if (isFirebase) {
      return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          if (user) {
            resolve({
              data: {
                session: {
                  user: mapFirebaseUser(user),
                  access_token: 'firebase-dummy-token', // Dummy token for flow logic
                }
              },
              error: null
            });
          } else {
            resolve({ data: { session: null }, error: null });
          }
        });
      });
    } else {
      return supabase.auth.getSession();
    }
  },

  onAuthStateChange(callback) {
    if (isFirebase) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        const mappedUser = mapFirebaseUser(user);
        const session = mappedUser ? { user: mappedUser, access_token: 'firebase-dummy-token' } : null;
        const event = user ? 'SIGNED_IN' : 'SIGNED_OUT';
        callback(event, session);
      });
      return { data: { subscription: { unsubscribe } } };
    } else {
      return supabase.auth.onAuthStateChange(callback);
    }
  }
};

/** Хелпер для маппинга ошибок Firebase */
function mapAuthError(error) {
  let message = error.message;
  if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
    message = 'Неверный email или пароль';
  } else if (error.code === 'auth/email-already-in-use') {
    message = 'Этот email уже используется';
  } else if (error.code === 'auth/weak-password') {
    message = 'Слишком слабый пароль (минимум 6 символов)';
  } else if (error.code === 'auth/invalid-email') {
    message = 'Некорректный формат email';
  }
  return { message };
}
