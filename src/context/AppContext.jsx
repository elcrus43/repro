/* eslint-disable react-refresh/only-export-components */
/**
 * AppContext.jsx
 *
 * Тонкий провайдер:
 *  1. Держит state (useReducer)
 *  2. Загружает данные при старте (Supabase auth)
 *  3. Пробрасывает dbDispatch из useDbDispatch
 *  4. Экспортирует reloadData для ручного обновления данных
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { reducer, EMPTY_STATE } from './reducer';
import { loadUserData, getCachedData, setCachedData, clearCachedData } from './supabaseSync';
import { useDbDispatch } from './useDbDispatch';
import { useToastContext } from '../components/Toast';
import { initCalendarAuth } from '../lib/googleCalendar';

/* ─── Context ──────────────────────────────────────────────────────────────── */

export const AppContext = createContext(null);

const ADMIN_EMAIL = 'yelchugin@gmail.com';

/* ─── Provider ─────────────────────────────────────────────────────────────── */

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, EMPTY_STATE);
  const { toast } = useToastContext();
  const dbDispatch = useDbDispatch(state, dispatch, toast.error);

  // Сохраняем профиль текущего пользователя для ручной перезагрузки
  const sessionUserRef = useRef(null);

  /* ── loadData: основная загрузка всех таблиц ──────────────────────────── */

  const loadData = useCallback(async (sessionUser, { silent = false, forceRefresh = false } = {}) => {
    if (!sessionUser) return;

    // 1. Показываем кеш мгновенно (если не принудительное обновление)
    const cached = !forceRefresh ? getCachedData(sessionUser.id) : null;
    if (cached && !silent) {
      dispatch({ type: 'SET_ALL', data: cached });
      dispatch({ type: 'SET_LOADING', value: false });
      console.log('[Data Load] Served from cache instantly. showings:', cached.showings?.length);
    } else if (!silent) {
      dispatch({ type: 'SET_LOADING', value: true });
    }

    // 2. Загружаем актуальные данные из Supabase
    console.log('[Data Load] Loading tables for role:', sessionUser.role);
    const data = await loadUserData(sessionUser.id, sessionUser.role);

    const allFailed = data.allFailed;

    if (allFailed) {
      console.warn('[Data Load] All queries failed, retrying in 3s...', data.error);
      if (!cached) dispatch({ type: 'SET_LOADING', value: true });
      await new Promise(r => setTimeout(r, 3000));
      const retryData = await loadUserData(sessionUser.id, sessionUser.role);
      if (retryData.error) {
        console.warn('[Data Load] Retry also failed:', retryData.error);
        if (!cached) toast.error('Не удалось загрузить данные: ' + retryData.error);
      } else {
        console.log('[Data Load] Retry succeeded!');
        setCachedData(sessionUser.id, retryData);
      }
      dispatch({ type: 'SET_ALL', data: retryData });
      return;
    }

    if (data.error && !silent) {
      console.warn('[Data Load] Partial error:', data.error);
      toast.error('Частичная ошибка загрузки: ' + data.error);
    }

    // 3. Обновляем UI свежими данными и сохраняем в кеш (с защитой от перезаписи меньшим кол-вом)
    console.log('[Data Load] Done. showings:', data.showings?.length, 'properties:', data.properties?.length);
    dispatch({ type: 'SET_ALL', data });

    const freshShowings = data.showings?.length || 0;
    const cachedShowings = cached?.showings?.length || 0;
    if (freshShowings >= cachedShowings || forceRefresh) {
      setCachedData(sessionUser.id, data);
    } else {
      console.warn('[Cache] Fresh data has FEWER showings than cache, not overwriting. fresh:', freshShowings, 'cached:', cachedShowings);
    }

    if (!silent && !cached) {
      const pCnt = data.properties?.length || 0;
      const cCnt = data.clients?.length || 0;
      if (pCnt > 0 || cCnt > 0) {
        toast.success(`Загружено: ${pCnt} объект(ов), ${cCnt} клиент(ов)`);
      }
    }
  }, [toast]);

  /* ── reloadData: вызывается из любого компонента по кнопке ────────────── */

  const reloadData = useCallback(async () => {
    const su = sessionUserRef.current;
    if (!su) { toast.error('Нет активной сессии. Войдите заново.'); return; }
    clearCachedData(su.id); // Очищаем кеш при ручном обновлении
    await loadData(su, { silent: false, forceRefresh: true });
    toast.success('Данные обновлены');
  }, [loadData, toast]);

  /* ── Auth flow ─────────────────────────────────────────────────────────── */

  useEffect(() => {
    let isInitial = true;

    async function loadProfileAndData(sessionUser) {
      try {
      console.log('[Data Load] Fetching profile for:', sessionUser.id);
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (profileErr && profileErr.code !== 'PGRST116') {
        console.error('[Profile load error]', profileErr);
        const fallback = {
          id: sessionUser.id,
          full_name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || 'Пользователь',
          email: sessionUser.email,
          phone: sessionUser.user_metadata?.phone || '',
          agency_name: '',
          role: 'realtor',
          status: 'approved',
        };
        dispatch({ type: 'SET_USER', user: fallback });
        sessionUserRef.current = fallback;
        await loadData(fallback);
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

        const enriched = { ...createdProfile, id: sessionUser.id };
        dispatch({ type: 'SET_USER', user: { ...createdProfile, email: sessionUser.email } });
        sessionUserRef.current = enriched;
        await loadData(enriched);
        return;
      }

      if (profile.status === 'pending' || profile.status === 'rejected') {
        await supabase.auth.signOut();
        dispatch({ type: 'SET_LOADING', value: false });
        return;
      }

      const enriched = { ...profile, id: sessionUser.id };
      dispatch({ type: 'SET_USER', user: { ...profile, email: sessionUser.email } });
      sessionUserRef.current = enriched;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        initCalendarAuth(session.access_token, !!profile.google_refresh_token);
      }

      await loadData(enriched);
      } catch (err) {
        console.error('[loadProfileAndData] Unexpected error:', err);
        dispatch({ type: 'SET_LOADING', value: false });
      }
    }

    async function init() {
      dispatch({ type: 'SET_LOADING', value: true });

      // Жёсткий глобальный таймаут: если через 45с загрузка не завершилась — останавливаем лоадер
      const hardTimeout = setTimeout(() => {
        console.warn('[Auth Hard Timeout] Force-stopping loader after 45s.');
        dispatch({ type: 'SET_LOADING', value: false });
      }, 45000);

      try {
        const sessionTimeout = setTimeout(() => {
          console.warn('[Auth Timeout] Session retrieval took too long.');
        }, 10000);

        console.log('[Auth Init] Getting session...');
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
        clearTimeout(sessionTimeout);

        if (sessionErr) console.error('[Auth Init] Session error:', sessionErr);

        if (session?.user) {
          console.log('[Auth Init] User found:', session.user.id);
          if (session.access_token) initCalendarAuth(session.access_token);
          await loadProfileAndData(session.user);
        } else {
          console.log('[Auth Init] No session found, showing login page');
          dispatch({ type: 'SET_LOADING', value: false });
        }
      } catch (err) {
        console.error('[Auth Init] Unexpected error:', err);
        dispatch({ type: 'SET_LOADING', value: false });
      } finally {
        clearTimeout(hardTimeout);
        isInitial = false;
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        sessionUserRef.current = null;
        dispatch({ type: 'LOGOUT' });
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        // Keep Google Calendar auth token in sync with Supabase session
        if (session.access_token) initCalendarAuth(session.access_token);
        if (!isInitial) await loadProfileAndData(session.user);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch: dbDispatch, reloadData }}>
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
