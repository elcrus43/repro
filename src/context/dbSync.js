/**
 * dbSync.js — Dynamic Database Synchronization Layer
 *
 * Перенаправляет запросы к loadUserData и syncAction на Supabase, Firebase,
 * Neon или localStorage в зависимости от флага VITE_BACKEND.
 *
 * Поддерживаемые значения VITE_BACKEND:
 *   supabase     — Supabase (по умолчанию)
 *   firebase     — Firebase Firestore
 *   neon         — Neon PostgreSQL (через /api/neon-query)
 *   localstorage — Локальное хранилище (оффлайн/разработка)
 */

import { loadUserData as loadUserDataSupabase, syncAction as syncActionSupabase } from './supabaseSync';
import { loadUserDataFirebase, syncActionFirebase } from './firebaseSync';
import { loadUserData as loadUserDataLocal, syncAction as syncActionLocal } from './localStorageSync';
import { loadUserData as loadUserDataNeon, syncAction as syncActionNeon } from './neonSync';

const backend = import.meta.env.VITE_BACKEND;

export const loadUserData = backend === 'localstorage'
    ? loadUserDataLocal
    : backend === 'firebase'
        ? loadUserDataFirebase
        : backend === 'neon'
            ? loadUserDataNeon
            : loadUserDataSupabase;

export const syncAction = backend === 'localstorage'
    ? syncActionLocal
    : backend === 'firebase'
        ? syncActionFirebase
        : backend === 'neon'
            ? syncActionNeon
            : syncActionSupabase;
