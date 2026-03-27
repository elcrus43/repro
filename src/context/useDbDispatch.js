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
import { syncAction, loadUserData } from './supabaseSync';
import { syncWithCalendar, deleteCalendarEvent } from './calendarSync';

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
          id:         action.client.id || nanoid(),
          created_at: now,
          updated_at: now,
        };
        break;

      case 'UPDATE_CLIENT':
        enhancedAction.client = { ...action.client, updated_at: now };
        break;

      case 'ADD_PROPERTY':
      case 'UPDATE_PROPERTY': {
        const prop = {
          ...action.property,
          id:         action.property.id || nanoid(),
          created_at: action.property.created_at || now,
          updated_at: now,
        };
        enhancedAction.property = prop;
        enhancedAction.matches  = _buildPropertyMatches(prop, stateRef.current, now);
        break;
      }

      case 'ADD_REQUEST':
      case 'UPDATE_REQUEST': {
        const req = {
          ...action.request,
          id:         action.request.id || nanoid(),
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
          enhancedAction.requestId  = match.request_id;
          enhancedAction.now        = now;
        }
        break;
      }

      case 'ADD_SHOWING': {
        const sh = { ...action.showing, id: action.showing.id || nanoid(), created_at: now };
        enhancedAction.showing = sh;
        enhancedAction.matches = sh.match_id
          ? stateRef.current.matches.map(m =>
              m.id === sh.match_id ? { ...m, status: 'showing_planned', updated_at: now } : m
            )
          : stateRef.current.matches;
        enhancedAction.task = action.customTask
          ? { ...action.customTask, id: action.customTask.id || nanoid(), created_at: now, realtor_id: sh.realtor_id }
          : _buildShowingTask(sh, now);
        break;
      }

      case 'UPDATE_SHOWING': {
        enhancedAction.showing = action.showing;
        enhancedAction.matches = action.showing.status === 'completed'
          ? stateRef.current.matches.map(m =>
              m.id === action.showing.match_id ? { ...m, status: 'showing_done', updated_at: now } : m
            )
          : stateRef.current.matches;
        break;
      }

      case 'ADD_TASK':
        enhancedAction.task = { ...action.task, id: action.task.id || nanoid(), created_at: now };
        break;

      case 'ADD_PRICE_ITEM':
        enhancedAction.item = {
          ...action.item,
          id:              action.item.id || nanoid(),
          created_at:      now,
          show_in_sale:    action.item.show_in_sale    ?? true,
          show_in_purchase: action.item.show_in_purchase ?? true,
        };
        break;

      case 'UPDATE_PRICE_ITEM':
        enhancedAction.item = { ...action.item };
        break;

      default:
        break;
    }

    /* ── Optimistic update ────────────────────────────────────────────── */
    dispatch(enhancedAction);

    /* ── Supabase sync ────────────────────────────────────────────────── */
    // onRollback вызывается при критической ошибке БД, чтобы откатить
    // изменения, которые мы уже применили optimistically.
    const onRollback = (failedAction) => {
      console.warn('[Rollback] Reverting optimistic update for:', failedAction.type);
      // Перезагрузка данных с сервера — самый надёжный способ отката
      // (вместо ручного reverse-action, который сложно реализовать для всех кейсов)
      dispatch({ type: 'SET_LOADING', value: true });
      const { currentUser } = stateRef.current;
      if (!currentUser) return;
      loadUserData(currentUser.id, currentUser.role).then(data => {
        dispatch({ type: 'SET_ALL', data });
      });
    };

    await syncAction(enhancedAction, { onError, onRollback });

    /* ── Google Calendar sync ─────────────────────────────────────────── */
    if (action.type === 'ADD_TASK' || action.type === 'UPDATE_TASK') {
      syncWithCalendar(action.type, enhancedAction.task, dispatch);
    } else if (action.type === 'ADD_SHOWING' || action.type === 'UPDATE_SHOWING') {
      syncWithCalendar(action.type, enhancedAction.showing, dispatch);
    } else if (action.type === 'DELETE_TASK' || action.type === 'DELETE_SHOWING') {
      const items = action.type === 'DELETE_TASK'
        ? stateRef.current.tasks
        : stateRef.current.showings;
      const item = items.find(i => i.id === action.id);
      deleteCalendarEvent(item, dispatch);
    }

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
      id:               existing?.id || nanoid(),
      ...m,
      realtor_id:       request?.realtor_id || prop.realtor_id,
      status:           existing?.status           || 'new',
      rejection_reason: existing?.rejection_reason || '',
      realtor_comment:  existing?.realtor_comment  || '',
      created_at:       existing?.created_at       || now,
      updated_at:       now,
    };
  });
}

function _buildRequestMatches(req, state, now) {
  return runMatchingForRequest(req, state.properties).map(m => {
    const existing = state.matches.find(
      ex => ex.request_id === req.id && ex.property_id === m.property_id
    );
    return {
      id:               existing?.id || nanoid(),
      ...m,
      realtor_id:       req.realtor_id,
      status:           existing?.status           || 'new',
      rejection_reason: existing?.rejection_reason || '',
      realtor_comment:  existing?.realtor_comment  || '',
      created_at:       existing?.created_at       || now,
      updated_at:       now,
    };
  });
}

function _buildShowingTask(sh, now) {
  return {
    id:          nanoid(),
    realtor_id:  sh.realtor_id,
    client_id:   sh.client_id   || null,
    property_id: sh.property_id || null,
    title:       `Показ — ${new Date(sh.showing_date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`,
    description: '',
    due_date:    sh.showing_date,
    priority:    'high',
    status:      'pending',
    created_at:  now,
  };
}
