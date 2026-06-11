/**
 * dbSync.js — Dynamic Database Synchronization Layer
 *
 * Перенаправляет запросы к loadUserData и syncAction на Supabase или Firebase
 * в зависимости от флага VITE_BACKEND.
 */

import { loadUserData as loadUserDataSupabase, syncAction as syncActionSupabase } from './supabaseSync';
import { loadUserDataFirebase, syncActionFirebase } from './firebaseSync';
import { loadUserData as loadUserDataLocal, syncAction as syncActionLocal } from './localStorageSync';

const backend = import.meta.env.VITE_BACKEND;

export const loadUserData = backend === 'localstorage' 
    ? loadUserDataLocal 
    : (backend === 'firebase' ? loadUserDataFirebase : loadUserDataSupabase);

export const syncAction = backend === 'localstorage' 
    ? syncActionLocal 
    : (backend === 'firebase' ? syncActionFirebase : syncActionSupabase);
