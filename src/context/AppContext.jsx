/* eslint-disable react-refresh/only-export-components */
/**
 * AppContext.jsx — РЕФАКТОРИНГ
 *
 * БЫЛО: 32 KB God Object — reducer + sync + calendar + enhance + provider в одном файле.
 *
 * СТАЛО: Тонкий провайдер, который только:
 *  1. Держит state (useReducer)
 *  2. Загружает данные при старте (Supabase auth)
 *  3. Пробрасывает dbDispatch из useDbDispatch
 *  4. Показывает ошибки через toast (не alert!)
 *
 * Логика вынесена в:
 *  - reducer.js        — чистый reducer
 *  - supabaseSync.js   — синхронизация с БД
 *  - calendarSync.js   — синхронизация с Google Calendar
 *  - useDbDispatch.js  — обогащение действий + оркестрация
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { reducer, EMPTY_STATE } from './reducer';
import { loadUserData } from './supabaseSync';
import { useDbDispatch } from './useDbDispatch';
import { useToastContext } from '../components/Toast';

/* ─── Context ──────────────────────────────────────────────────────────────── */

export const AppContext = createContext(null);

const ADMIN_EMAIL = 'yelchugin@gmail.com';

/* ─── Provider ─────────────────────────────────────────────────────────────── */

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, EMPTY_STATE);

  // toast из ToastProvider (ToastProvider должен быть выше AppProvider в App.jsx)
  const { toast } = useToastContext();

  // dbDispatch: обогащает действие → dispatch → Supabase → Calendar
  const dbDispatch = useDbDispatch(state, dispatch, toast.error);

  /* ── Auth & Data Loading ────────────────────────────────────────────── */

  useEffect(() => {
    let isInitial = true;

    async function loadProfileAndData(sessionUser) {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      // Ошибка загрузки профиля (не "не найден")
      if (profileErr && profileErr.code !== 'PGRST116') {
        console.error('[Profile load error]', profileErr);
        const fallbackProfile = {
          id: sessionUser.id,
          full_name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || 'Пользователь',
          email: sessionUser.email,
          phone: sessionUser.user_metadata?.phone || '',
          agency_name: '',
          role: 'realtor',
          status: 'approved',
        };
        dispatch({ type: 'SET_USER', user: fallbackProfile });
        try {
          const data = await loadUserData(sessionUser.id, 'realtor');
          dispatch({ type: 'SET_ALL', data });
        } catch (e) {
          console.error('[Data load error]', e);
          dispatch({ type: 'SET_LOADING', value: false });
        }
        return;
      }

      // Новый пользователь — профиль ещё не создан
      if (!profile) {
        const isAdmin = sessionUser.email === ADMIN_EMAIL;
        const newProfile = {
          id: sessionUser.id,
          full_name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || 'Пользователь',
          phone: sessionUser.user_metadata?.phone || '',
          agency_name: '',
          role: isAdmin ? 'admin' : 'realtor',
          status: isAdmin ? 'approved' : 'pending',
        };

        const { data: createdProfile, error: createErr } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (createErr) {
          console.error('[Profile creation error]', createErr);
          dispatch({ type: 'SET_LOADING', value: false });
          return;
        }

        // Ожидающий пользователь — выкидываем
        if (createdProfile.status === 'pending') {
          await supabase.auth.signOut();
          dispatch({ type: 'SET_LOADING', value: false });
          return;
        }

        const data = await loadUserData(sessionUser.id, createdProfile.role);
        dispatch({ type: 'SET_USER', user: { ...createdProfile, email: sessionUser.email } });
        dispatch({ type: 'SET_ALL', data });
        return;
      }

      // Существующий пользователь: роль берём ТОЛЬКО из БД (не из email)
      if (profile.status === 'pending' || profile.status === 'rejected') {
        await supabase.auth.signOut();
        dispatch({ type: 'SET_LOADING', value: false });
        return;
      }

      dispatch({ type: 'SET_USER', user: { ...profile, email: sessionUser.email } });

      // loadUserData использует safeQuery внутри — сетевые ошибки изолированы
      const data = await loadUserData(sessionUser.id, profile.role);

      if (data.error) {
        toast.warn(`Часть данных не загрузилась: ${data.error}`);
      }

      // Всегда диспатчим — даже если часть запросов упала, покажем что загрузилось
      dispatch({ type: 'SET_ALL', data });

      const propCount = data.properties?.length || 0;
      const clientCount = data.clients?.length || 0;
      if (propCount > 0 || clientCount > 0) {
        toast.success(`Загружено: ${propCount} объект(ов), ${clientCount} клиент(ов)`);
      } else if (!data.error) {
        toast.warn('Данных пока нет. Создайте первый объект или клиента.');
      }

    }

    async function init() {
      dispatch({ type: 'SET_LOADING', value: true });

      // Safety timeout: если сессия не отвечает > 10s — показываем логин
      const timeout = setTimeout(() => {
        console.warn('[Auth Timeout] Session retrieval took too long.');
        dispatch({ type: 'SET_LOADING', value: false });
      }, 10000);

      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      clearTimeout(timeout);

      if (sessionErr) console.error('[Session error]', sessionErr);

      if (session?.user) {
        await loadProfileAndData(session.user);
      } else {
        dispatch({ type: 'SET_LOADING', value: false });
      }

      isInitial = false;
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        dispatch({ type: 'LOGOUT' });
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        if (!isInitial) {
          await loadProfileAndData(session.user);
        }
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch: dbDispatch }}>
      {children}
    </AppContext.Provider>
  );
}

/* ─── Hook ─────────────────────────────────────────────────────────────────── */

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
