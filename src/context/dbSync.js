/**
 * dbSync.js — Dynamic Database Synchronization Layer
 *
 * Перенаправляет запросы к loadUserData и syncAction на Neon или localStorage
 * в зависимости от флага VITE_BACKEND.
 *
 * Поддерживаемые значения VITE_BACKEND:
 *   neon         — Neon PostgreSQL через /api/neon-query (по умолчанию)
 *   localstorage — Локальное хранилище (оффлайн/разработка)
 */

import { loadUserData as loadUserDataLocal, syncAction as syncActionLocal } from './localStorageSync';
import { loadUserData as loadUserDataNeon, syncAction as syncActionNeon } from './neonSync';

const backend = import.meta.env.VITE_BACKEND || 'neon';

export const loadUserData = backend === 'localstorage'
    ? loadUserDataLocal
    : loadUserDataNeon;

export const syncAction = backend === 'localstorage'
    ? syncActionLocal
    : syncActionNeon;
