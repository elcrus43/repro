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
    let isInitial = true;         // true while init() is still running
    let pendingSession = null;    // captures SIGNED_IN that fires before init() finishes

    async function loadProfileAndData(sessionUser) {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

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

      if (profile.status === 'pending' || profile.status === 'rejected') {
        await supabase.auth.signOut();
        dispatch({ type: 'SET_LOADING', value: false });
        return;
      }

      dispatch({ type: 'SET_USER', user: { ...profile, email: sessionUser.email } });
      try {
        const data = await loadUserData(sessionUser.id, profile.role);
        if (data.error) toast.warn(`Данные загружены частично: ${data.error}`);
        dispatch({ type: 'SET_ALL', data });
        const propCount = data.properties?.length || 0;
        const clientCount = data.clients?.length || 0;
        if (propCount > 0 || clientCount > 0) {
          toast.success(`Загружено объектов: ${propCount}, клиентов: ${clientCount}`);
        }
      } catch (e) {
        console.error('[Data load error]', e);
        toast.error('Ошибка загрузки данных. Попробуйте обновить страницу.');
        dispatch({ type: 'SET_LOADING', value: false });
      }
    }

    async function init() {
      dispatch({ type: 'SET_LOADING', value: true });

      const timeout = setTimeout(() => {
        console.warn('[Auth Timeout] Session retrieval took too long.');
        dispatch({ type: 'SET_LOADING', value: false });
      }, 10000);

      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      clearTimeout(timeout);
      if (sessionErr) console.error('[Session error]', sessionErr);

      if (session?.user) {
        // Normal case: session found immediately
        await loadProfileAndData(session.user);
      } else if (pendingSession) {
        // Mobile cold-start: getSession() returned null but the auth listener
        // already captured a SIGNED_IN event with the real session.
        console.info('[Auth] Using pendingSession from onAuthStateChange (mobile cold-start)');
        await loadProfileAndData(pendingSession);
      } else {
        // Truly not logged in
        dispatch({ type: 'SET_LOADING', value: false });
      }

      isInitial = false;
      pendingSession = null;
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        dispatch({ type: 'LOGOUT' });
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        if (isInitial) {
          // init() is still running — save for it to pick up (mobile cold-start)
          pendingSession = session.user;
        } else {
          // Normal post-init login (user logged in manually or token refreshed)
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
