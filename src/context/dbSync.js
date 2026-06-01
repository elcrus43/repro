/**
 * dbSync.js — Dynamic Database Synchronization Layer
 *
 * Перенаправляет запросы к loadUserData и syncAction на Supabase или Firebase
 * в зависимости от флага VITE_BACKEND.
 */

import { loadUserData as loadUserDataSupabase, syncAction as syncActionSupabase } from './supabaseSync';
import { loadUserDataFirebase, syncActionFirebase } from './firebaseSync';

const isFirebase = import.meta.env.VITE_BACKEND === 'firebase';

export const loadUserData = isFirebase ? loadUserDataFirebase : loadUserDataSupabase;
export const syncAction = isFirebase ? syncActionFirebase : syncActionSupabase;
