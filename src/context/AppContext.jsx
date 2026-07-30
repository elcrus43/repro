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
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { reducer, EMPTY_STATE } from './reducer';
import { loadUserData } from './dbSync';
import { authService } from '../lib/auth';
import { useDbDispatch } from './useDbDispatch';
import { useToastContext } from '../components/Toast';
import { initCalendarAuth } from '../lib/googleCalendar';
import { neonDb } from '../lib/neon';

/* ─── Cache helpers ────────────────────────────────────────────────────────── */
const CACHE_KEY = (userId) => `rm_cache_${userId}`;
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 часов

function getCachedData(userId) {
  try {
    const raw = localStorage.getItem(CACHE_KEY(userId));
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY(userId));
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedData(userId, data) {
  try {
    localStorage.setItem(CACHE_KEY(userId), JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

function clearCachedData(userId) {
  try {
    localStorage.removeItem(CACHE_KEY(userId));
  } catch {}
}

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
      console.warn('[Data Load] All queries failed, serving from cache or seed data.', data.error);
      if (!cached) {
        dispatch({ type: 'SET_ALL', data });
      }
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
    const backend = import.meta.env.VITE_BACKEND || 'neon';
    const isFirebase = backend === 'firebase';
    const isLocalStorage = backend === 'localstorage';
    const isNeon = backend === 'neon';

    async function loadProfileAndData(sessionUser) {
      try {
        console.log('[Data Load] Fetching profile for:', sessionUser.id);
        let profile = null;
        let profileErr = null;

        if (isLocalStorage) {
          profile = {
            id: sessionUser.id,
            full_name: 'Локальный пользователь',
            email: 'local@example.com',
            phone: '',
            agency_name: '',
            role: 'admin',
            status: 'approved',
          };
        } else if (isFirebase) {
          try {
            const docRef = doc(db, 'profiles', sessionUser.id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              profile = { id: docSnap.id, ...docSnap.data() };
            }
          } catch (e) {
            profileErr = e;
          }
        } else {
          const res = await neonDb.select('profiles', { id: sessionUser.id });
          if (res.error) {
            profileErr = res.error;
          } else {
            profile = res.data?.[0] || null;
          }
        }

        if (profileErr && (isFirebase || isNeon || profileErr.code !== 'PGRST116')) {
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

        if (!profile && !isLocalStorage) {
          const isAdmin = sessionUser.email === ADMIN_EMAIL;
          const newProfile = {
            id: sessionUser.id,
            full_name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || 'Пользователь',
            phone: sessionUser.user_metadata?.phone || '',
            agency_name: '',
            role: isAdmin ? 'admin' : 'realtor',
            status: isAdmin ? 'approved' : 'pending',
          };

          let createdProfile = null;
          let createErr = null;

          if (isFirebase) {
            try {
              await setDoc(doc(db, 'profiles', sessionUser.id), newProfile);
              createdProfile = { ...newProfile, id: sessionUser.id };
            } catch (e) {
              createErr = e;
            }
          } else {
            const res = await neonDb.insert('profiles', newProfile);
            createdProfile = res.data?.[0];
            createErr = res.error;
          }

          if (createErr) {
            console.error('[Profile creation error]', createErr);
            dispatch({ type: 'SET_LOADING', value: false });
            return;
          }

          if (createdProfile.status === 'pending') {
            await authService.signOut();
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
          await authService.signOut();
          dispatch({ type: 'SET_LOADING', value: false });
          return;
        }

        const enriched = { ...profile, id: sessionUser.id };
        dispatch({ type: 'SET_USER', user: { ...profile, email: sessionUser.email } });
        sessionUserRef.current = enriched;
        
        const { data: { session } } = await authService.getSession();
        if (session?.access_token && !isFirebase) {
          initCalendarAuth(session.access_token, !!profile.google_refresh_token);
        }

        await loadData(enriched);
      } catch (err) {
        console.error('[loadProfileAndData] Unexpected error:', err);
        dispatch({ type: 'SET_LOADING', value: false });
      }
    }

    // Глобальный страховочный таймаут вне init() — не может быть заблокирован await внутри init
    const hardTimeout = setTimeout(() => {
      console.warn('[Auth Hard Timeout] Force-stopping loader after 8s.');
      dispatch({ type: 'SET_LOADING', value: false });
    }, 8000);

    async function init() {
      dispatch({ type: 'SET_LOADING', value: true });

      try {
        console.log('[Auth Init] Getting session...');
        const { data: { session }, error: sessionErr } = await authService.getSession();

        if (sessionErr) console.error('[Auth Init] Session error:', sessionErr);

        if (session?.user) {
          console.log('[Auth Init] User found:', session.user.id);
          if (session.access_token && !isFirebase) initCalendarAuth(session.access_token);
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

    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        sessionUserRef.current = null;
        dispatch({ type: 'LOGOUT' });
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        if (session.access_token && !isFirebase) initCalendarAuth(session.access_token);
        if (!isInitial) await loadProfileAndData(session.user);
      }
    });

    return () => {
      clearTimeout(hardTimeout);
      subscription.unsubscribe();
    };
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
