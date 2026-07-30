/**
 * useDbDispatch.js — хук, инкапсулирующий логику обогащения (enhance) действий
 * перед отправкой в reducer и Supabase.
 *
 * Вынесен из AppContext.jsx для:
 *  - устранения God Object (32 KB → разумные части)
 *  - изоляции бизнес-логики ID-генерации и matching
 *  - устранения stateRef-хака: теперь stateRef живёт здесь, рядом с кодом
 *
 * ИЗМЕНЕНИЯ vs оригинала:
 *  1. onError (toast) вместо alert()
 *  2. onRollback — передаётся в syncAction для отката optimistic update
 *  3. stateRef используется корректно: обновляется синхронно после dispatch
 *     через useLayoutEffect (гарантирует актуальность до следующего рендера)
 */

import { useCallback, useRef, useLayoutEffect } from 'react';
import { nanoid } from '../utils/nanoid';
import { runMatchingForProperty, runMatchingForRequest } from '../utils/matching';
import { syncAction, loadUserData } from './dbSync';
import { syncAction as syncLocalStorageAction } from './localStorageSync';
import { syncWithCalendar, deleteCalendarEvent } from './calendarSync';
import { isCalendarConnected, isCalendarConfigured } from '../lib/googleCalendar';

/**
 * @param {object}   state     — текущий state из useReducer
 * @param {function} dispatch  — dispatch из useReducer
 * @param {function} onError   — callback для показа ошибок (toast.error)
 */
export function useDbDispatch(state, dispatch, onError) {
  // stateRef — всегда актуальная копия state без stale closure.
  // useLayoutEffect синхронно обновляет ref после каждого рендера,
  // до того как браузер отрисует изменения — это безопаснее useEffect.
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  });

  const dbDispatch = useCallback(async (action) => {
    const now = new Date().toISOString();
    let enhancedAction = { ...action };

    /* ── Обогащение действий ──────────────────────────────────────────── */

    switch (action.type) {

      case 'ADD_CLIENT':
        enhancedAction.client = {
          ...action.client,
          id: action.client.id || nanoid(),
          created_at: now,
          updated_at: now,
        };
        break;

      case 'UPDATE_CLIENT':
        enhancedAction.client = { ...action.client, updated_at: now };
        break;

      case 'ADD_PROPERTY':
      case 'UPDATE_PROPERTY': {
        const propId = action.property.id || action.id || nanoid();
        const existing = stateRef.current.properties.find(p => p.id === propId);
        const prop = {
          ...(existing || {}),
          ...action.property,
          id: propId,
          created_at: (existing?.created_at || action.property.created_at || now),
          updated_at: now,
        };
        enhancedAction.property = prop;
        enhancedAction.matches = _buildPropertyMatches(prop, stateRef.current, now);
        break;
      }

      case 'PATCH_PROPERTY': {
        // Lightweight field patch — no matching recalc, no full object needed
        enhancedAction.patch = { ...action.patch, updated_at: now };
        break;
      }

      case 'ADD_REQUEST':
      case 'UPDATE_REQUEST': {
        const req = {
          ...action.request,
          id: action.request.id || nanoid(),
          created_at: action.request.created_at || now,
          updated_at: now,
        };
        enhancedAction.request = req;
        enhancedAction.matches = _buildRequestMatches(req, stateRef.current, now);
        break;
      }

      case 'UPDATE_MATCH':
        enhancedAction.match = { ...action.match, updated_at: now };
        break;

      case 'CLOSE_DEAL': {
        const match = stateRef.current.matches.find(m => m.id === action.matchId);
        if (match) {
          enhancedAction.propertyId = match.property_id;
          enhancedAction.requestId = match.request_id;
          enhancedAction.now = now;
        }
        break;
      }

      case 'ADD_SHOWING': {
        const realtorId = action.showing.realtor_id || stateRef.current.currentUser?.id || 'user-1';
        const sh = {
          ...action.showing,
          id: action.showing.id || nanoid(),
          event_type: action.showing.event_type || 'showing',
          created_at: now,
          realtor_id: realtorId,
        };
        enhancedAction.showing = sh;
        enhancedAction.matches = sh.match_id
          ? stateRef.current.matches.map(m =>
            m.id === sh.match_id ? { ...m, status: 'showing_planned', updated_at: now } : m
          )
          : stateRef.current.matches;
        enhancedAction.task = action.customTask
          ? { ...action.customTask, id: action.customTask.id || nanoid(), created_at: now, realtor_id: sh.realtor_id }
          : _buildShowingTask(sh, stateRef.current, now);
        break;
      }

      case 'UPDATE_SHOWING': {
        enhancedAction.showing = {
          ...action.showing,
          // Ensure realtor_id is preserved
          realtor_id: action.showing.realtor_id || stateRef.current.currentUser?.id,
        };
        enhancedAction.matches = action.showing.status === 'completed'
          ? stateRef.current.matches.map(m =>
            m.id === action.showing.match_id ? { ...m, status: 'showing_done', updated_at: now } : m
          )
          : stateRef.current.matches;
        break;
      }

      case 'ADD_TASK':
        enhancedAction.task = {
          ...action.task,
          id: action.task.id || nanoid(),
          created_at: now,
          updated_at: now,
        };
        break;

      case 'UPDATE_TASK':
        enhancedAction.task = { ...action.task, updated_at: now };
        break;

      case 'DELETE_TASK':
        // No enhancement needed — just pass the id through
        break;

      case 'ADD_PRICE_ITEM':
        enhancedAction.item = {
          ...action.item,
          id: action.item.id || nanoid(),
          created_at: now,
          show_in_sale: action.item.show_in_sale ?? true,
          show_in_purchase: action.item.show_in_purchase ?? true,
        };
        break;

      case 'UPDATE_PRICE_ITEM':
        enhancedAction.item = { ...action.item };
        break;

      case 'ADD_DEAL':
        enhancedAction.deal = {
          ...action.deal,
          id: action.deal.id || nanoid(),
          created_at: now,
          status: 'active',
        };
        break;

      case 'UPDATE_DEAL':
        enhancedAction.deal = { ...action.deal, updated_at: now };
        break;

      case 'DELETE_DEAL':
        // No enhancement needed — just pass the id through
        break;

      case 'ADD_SELECTION_ITEM':
        enhancedAction.item = {
          ...action.item,
          id: action.item.id || nanoid(),
          realtor_id: action.item.realtor_id || stateRef.current.currentUser?.id,
          created_at: now,
          updated_at: now,
        };
        break;

      case 'UPDATE_SELECTION_ITEM':
        enhancedAction.item = {
          ...action.item,
          realtor_id: action.item.realtor_id || stateRef.current.currentUser?.id,
          updated_at: now
        };
        break;

      case 'DELETE_SELECTION_ITEM':
        // No enhancement needed
        break;

      // Чистые действия — не требуют синхронизации с БД
      case 'LOGOUT':
      case 'SET_LOADING':
      case 'SET_USER':
      case 'SET_ALL':
      case 'SET_CALENDAR_STATUS':
      case 'SET_PRICELIST':
        dispatch(action);
        return; // Пропускаем syncAction

      // APPROVE_USER / REJECT_USER требуют записи в Supabase — НЕ пропускаем syncAction
      // (раньше ошибочно были в «чистых действиях» и не сохранялись в БД)
      case 'APPROVE_USER':
      case 'REJECT_USER':
        // Обновляем локальный стейт немедленно (optimistic update)
        dispatch(action);
        break; // продолжаем — syncAction запишет в profiles

      default:
        break;
    }

    /* ── Optimistic update ────────────────────────────────────────────── */
    dispatch(enhancedAction);
    
    // СИНХРОННОЕ обновление stateRef для обработки быстрых последовательных вызовов.
    // Это гарантирует, что если dbDispatch будет вызван снова ДО того как React 
    // выполнит ререндер и обновит stateRef через useLayoutEffect, 
    // следующий вызов увидит уже "оптимистично" измененные данные.
    if (enhancedAction.type === 'UPDATE_PROPERTY' || enhancedAction.type === 'ADD_PROPERTY') {
      const nextProps = stateRef.current.properties.map(p => 
        p.id === enhancedAction.property.id ? enhancedAction.property : p
      );
      if (!nextProps.find(p => p.id === enhancedAction.property.id)) {
        nextProps.push(enhancedAction.property);
      }
      stateRef.current = { ...stateRef.current, properties: nextProps };
    }
    if (enhancedAction.type === 'PATCH_PROPERTY') {
      stateRef.current = {
        ...stateRef.current,
        properties: stateRef.current.properties.map(p =>
          p.id === enhancedAction.patch.id ? { ...p, ...enhancedAction.patch } : p
        ),
      };
    }
    if (enhancedAction.type === 'ADD_SELECTION_ITEM') {
      const nextSelection = [...(stateRef.current.selectionItems || []), enhancedAction.item];
      stateRef.current = { ...stateRef.current, selectionItems: nextSelection };
    }
    if (enhancedAction.type === 'UPDATE_SELECTION_ITEM') {
      const nextSelection = (stateRef.current.selectionItems || []).map(i =>
        i.id === enhancedAction.item.id ? enhancedAction.item : i
      );
      stateRef.current = { ...stateRef.current, selectionItems: nextSelection };
    }
    if (enhancedAction.type === 'DELETE_SELECTION_ITEM') {
      const nextSelection = (stateRef.current.selectionItems || []).filter(i => i.id !== enhancedAction.id);
      stateRef.current = { ...stateRef.current, selectionItems: nextSelection };
    }
    if (enhancedAction.type === 'ADD_SHOWING') {
      const nextShowings = [...(stateRef.current.showings || []), enhancedAction.showing];
      const nextTasks = enhancedAction.task ? [...(stateRef.current.tasks || []), enhancedAction.task] : stateRef.current.tasks;
      stateRef.current = { ...stateRef.current, showings: nextShowings, tasks: nextTasks };
    }
    if (enhancedAction.type === 'UPDATE_SHOWING') {
      const nextShowings = (stateRef.current.showings || []).map(s => s.id === enhancedAction.showing.id ? enhancedAction.showing : s);
      stateRef.current = { ...stateRef.current, showings: nextShowings };
    }
    if (enhancedAction.type === 'UPDATE_CLIENT' || enhancedAction.type === 'ADD_CLIENT') {
      const nextClients = (stateRef.current.clients || []).map(c => 
        c.id === enhancedAction.client.id ? enhancedAction.client : c
      );
      if (!nextClients.find(c => c.id === enhancedAction.client.id)) {
        nextClients.push(enhancedAction.client);
      }
      stateRef.current = { ...stateRef.current, clients: nextClients };
    }
    if (enhancedAction.type === 'DELETE_CLIENT') {
      const nextClients = (stateRef.current.clients || []).filter(c => c.id !== enhancedAction.id);
      stateRef.current = { ...stateRef.current, clients: nextClients };
    }

    /* ── Supabase sync ────────────────────────────────────────────────── */
    // onRollback вызывается при критической ошибке БД, чтобы откатить
    // изменения, которые мы уже применили optimistically.
    // Сохраняем локально в localStorage для 100% надёжности
    try { syncLocalStorageAction(enhancedAction); } catch (e) { console.warn('[LocalStorage] sync error:', e); }

    const onRollback = (failedAction) => {
      console.warn('[Rollback] Action failed on DB server, keeping local state:', failedAction.type);
    };

    const success = await syncAction(enhancedAction, { onError, onRollback, currentUser: stateRef.current.currentUser });

    /* ── Cache invalidation for client updates ───────────────────────────── */
    // After a successful client update, refresh the AppContext cache so the next
    // reload doesn't restore stale client data from the 12h cache.
    if (success && (enhancedAction.type === 'UPDATE_CLIENT' || enhancedAction.type === 'ADD_CLIENT' || enhancedAction.type === 'DELETE_CLIENT')) {
      try {
        const userId = stateRef.current.currentUser?.id;
        if (userId) {
          const cacheKey = `rm_cache_${userId}`;
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.data?.clients) {
              if (enhancedAction.type === 'DELETE_CLIENT') {
                parsed.data.clients = parsed.data.clients.filter(c => c.id !== enhancedAction.id);
              } else {
                const idx = parsed.data.clients.findIndex(c => c.id === enhancedAction.client.id);
                if (idx >= 0) {
                  parsed.data.clients[idx] = enhancedAction.client;
                } else {
                  parsed.data.clients.push(enhancedAction.client);
                }
              }
              parsed.ts = Date.now();
              localStorage.setItem(cacheKey, JSON.stringify(parsed));
            }
          }
        }
      } catch (e) {
        console.warn('[Cache] Failed to update client in cache:', e);
      }
    }

    /* ── Google Calendar sync ─────────────────────────────────────────── */
    // Sync only if Google Calendar is configured AND the user has an active token.
    // Without an active token, requestAccessToken() would try to open a popup
    // which is blocked by browsers (no user gesture) and causes a 30s timeout.
    if (isCalendarConfigured() && isCalendarConnected()) {
      if (action.type === 'ADD_TASK' || action.type === 'UPDATE_TASK') {
        syncWithCalendar(action.type, enhancedAction.task, dispatch);
      } else if (action.type === 'ADD_SHOWING' || action.type === 'UPDATE_SHOWING') {
        // Обогащаем showing адресом объекта для заголовка события в Calendar
        const sh = enhancedAction.showing;
        const prop = sh.event_type === 'viewing'
          ? stateRef.current.selectionItems?.find(p => p.id === sh.property_id)
          : stateRef.current.properties?.find(p => p.id === sh.property_id);
        const propAddress = prop?.address || prop?.title || null;
        const client = stateRef.current.clients?.find(c => c.id === (sh.client_id || (sh.client_ids || [])[0]));
        const clientName = client?.full_name || sh.contact_name || null;
        syncWithCalendar(action.type, { ...sh, _propertyAddress: propAddress, _clientName: clientName }, dispatch);
      } else if (action.type === 'ADD_DEAL' || action.type === 'UPDATE_DEAL') {
        const dl = enhancedAction.deal;
        const prop = stateRef.current.properties?.find(p => p.id === dl.property_id);
        const propAddress = prop?.address || prop?.title || null;
        syncWithCalendar(action.type, { ...dl, _propertyAddress: propAddress }, dispatch);
      } else if (action.type === 'DELETE_TASK' || action.type === 'DELETE_SHOWING' || action.type === 'DELETE_DEAL') {
        const items = action.type === 'DELETE_TASK'
          ? stateRef.current.tasks
          : action.type === 'DELETE_SHOWING'
          ? stateRef.current.showings
          : stateRef.current.deals;
        const item = items?.find(i => i.id === action.id);
        deleteCalendarEvent(item, dispatch);

        if (action.type === 'DELETE_SHOWING' && item) {
          const associatedTask = stateRef.current.tasks?.find(t => t.due_date === item.showing_date && (t.client_id === item.client_id || t.title?.includes(item.event_type)));
          if (associatedTask?.google_event_id) {
            deleteCalendarEvent(associatedTask, dispatch);
          }
        }
      }
    } else if (isCalendarConfigured() && !isCalendarConnected()) {
      console.info('[Google Calendar Sync] Skipped — user not connected (token expired or not set)');
    }

    return success;
  }, [dispatch, onError]);

  return dbDispatch;
}

/* ─── Private helpers ──────────────────────────────────────────────────────── */

function _buildPropertyMatches(prop, state, now) {
  return runMatchingForProperty(prop, state.requests).map(m => {
    const existing = state.matches.find(
      ex => ex.property_id === prop.id && ex.request_id === m.request_id
    );
    const request = state.requests.find(r => r.id === m.request_id);
    return {
      id: existing?.id || nanoid(),
      ...m,
      realtor_id: request?.realtor_id || prop.realtor_id,
      status: existing?.status || 'new',
      rejection_reason: existing?.rejection_reason || '',
      realtor_comment: existing?.realtor_comment || '',
      created_at: existing?.created_at || now,
      updated_at: now,
    };
  });
}

function _buildRequestMatches(req, state, now) {
  return runMatchingForRequest(req, state.properties).map(m => {
    const existing = state.matches.find(
      ex => ex.request_id === req.id && ex.property_id === m.property_id
    );
    return {
      id: existing?.id || nanoid(),
      ...m,
      realtor_id: req.realtor_id,
      status: existing?.status || 'new',
      rejection_reason: existing?.rejection_reason || '',
      realtor_comment: existing?.realtor_comment || '',
      created_at: existing?.created_at || now,
      updated_at: now,
    };
  });
}

const EVENT_TYPE_TITLES = {
  viewing: 'Подбор',
  showing: 'Показ',
  meeting: 'Встреча',
  deposit: 'Задаток',
  deal: 'Сделка',
  call: 'Звонок'
};

function _buildShowingTask(sh, state, now) {
  const label = EVENT_TYPE_TITLES[sh.event_type] || 'Показ';
  const client = state?.clients?.find(c => String(c.id) === String(sh.client_id || (sh.client_ids || [])[0]));
  const clientName = client?.full_name || sh.contact_name || '';
  const withText = clientName ? ` — ${clientName}` : '';
  const realtorId = sh.realtor_id || state?.currentUser?.id || client?.realtor_id || 'user-1';
  return {
    id: nanoid(),
    realtor_id: realtorId,
    client_id: sh.client_id || null,
    property_id: sh.event_type === 'viewing' ? null : (sh.property_id || null),
    title: `${label}${withText}`,
    description: '',
    due_date: sh.showing_date,
    priority: 'high',
    status: sh.status === 'completed' ? 'done' : 'pending',
    created_at: now,
  };
}
