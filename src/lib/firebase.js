/**
 * firebase.js — Firebase client initialization (lazy/conditional)
 *
 * Инициализация Firebase App, Firestore, Auth и Storage.
 * Работает параллельно с Supabase — переключение через VITE_BACKEND.
 *
 * ⚠️ Инициализация происходит ТОЛЬКО если VITE_FIREBASE_API_KEY задан,
 * чтобы не крашить приложение на средах без Firebase (Vercel, Neon и т.д.)
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

// Только инициализируем Firebase если API-ключ задан
const isFirebaseConfigured = !!apiKey && apiKey !== 'undefined' && apiKey !== '';

let app, db, auth, storage;

if (isFirebaseConfigured) {
  const firebaseConfig = {
    apiKey,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  };

  app     = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  db      = getFirestore(app);
  auth    = getAuth(app);
  storage = getStorage(app);
} else {
  // Заглушки — Firebase не сконфигурирован на этой среде
  if (import.meta.env.DEV) {
    console.warn('[Firebase] VITE_FIREBASE_API_KEY не задан — Firebase отключён. Используется другой бэкенд.');
  }
  app     = null;
  db      = null;
  auth    = null;
  storage = null;
}

export { db, auth, storage };
export default app;
