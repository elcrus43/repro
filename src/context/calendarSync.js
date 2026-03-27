/**
 * calendarSync.js — логика синхронизации задач и показов с Google Calendar.
 *
 * Вынесена из AppContext.jsx для:
 *  - разделения ответственности (SRP)
 *  - удобного отключения/замены (mock для тестов)
 *  - устранения God Object
 *
 * Экспортирует единственную функцию syncWithCalendar().
 */

import { supabase } from '../lib/supabase';
import {
  addEventToCalendar,
  updateEventInCalendar,
  deleteEventFromCalendar,
} from '../lib/googleCalendar';

/**
 * Синхронизирует задачу или показ с Google Calendar.
 *
 * @param {string}   actionType  — тип действия ('ADD_TASK', 'UPDATE_SHOWING', и т.д.)
 * @param {object}   item        — задача или показ (после enhance)
 * @param {function} dispatch    — диспатч для обновления calendarStatus и google_event_id
 */
export async function syncWithCalendar(actionType, item, dispatch) {
  if (!item) return;

  const isShowing = actionType.includes('SHOWING');
  const table     = isShowing ? 'showings' : 'tasks';
  const updateKey = isShowing ? 'showing' : 'task';
  const updateType = isShowing ? 'UPDATE_SHOWING' : 'UPDATE_TASK';

  const date  = item.due_date || item.showing_date;
  const title = item.title || `Показ: ${item.showing_date}`;
  const description = item.description || '';

  // Нет даты и нет существующего события — ничего не делаем
  if (!date && !item.google_event_id) return;

  dispatch({ type: 'SET_CALENDAR_STATUS', status: 'loading' });

  try {
    if (item.google_event_id && !date) {
      // Дата убрана — удаляем событие из Calendar
      await deleteEventFromCalendar(item.google_event_id);
      await supabase.from(table).update({ google_event_id: null }).eq('id', item.id);
      dispatch({ type: updateType, [updateKey]: { ...item, google_event_id: null } });

    } else if (item.google_event_id) {
      // Событие уже есть — обновляем
      await updateEventInCalendar(item.google_event_id, { title, description, startDateTime: date });

    } else if (date) {
      // Нового события нет — создаём
      const calEvent = await addEventToCalendar({ title, description, startDateTime: date });
      if (calEvent?.id) {
        await supabase.from(table).update({ google_event_id: calEvent.id }).eq('id', item.id);
        dispatch({ type: updateType, [updateKey]: { ...item, google_event_id: calEvent.id } });
      }
    }

    dispatch({ type: 'SET_CALENDAR_STATUS', status: 'ok' });
    setTimeout(() => dispatch({ type: 'SET_CALENDAR_STATUS', status: null }), 3000);

  } catch (err) {
    console.warn('[Google Calendar Sync Error]', err.message);
    dispatch({ type: 'SET_CALENDAR_STATUS', status: 'error' });
    setTimeout(() => dispatch({ type: 'SET_CALENDAR_STATUS', status: null }), 4000);
  }
}

/**
 * Удаляет событие Google Calendar при удалении задачи или показа.
 *
 * @param {object|undefined} item     — задача или показ из текущего state
 * @param {function}         dispatch — диспатч для статуса
 */
export async function deleteCalendarEvent(item, dispatch) {
  if (!item?.google_event_id) return;

  dispatch({ type: 'SET_CALENDAR_STATUS', status: 'loading' });

  try {
    await deleteEventFromCalendar(item.google_event_id);
    dispatch({ type: 'SET_CALENDAR_STATUS', status: 'ok' });
    setTimeout(() => dispatch({ type: 'SET_CALENDAR_STATUS', status: null }), 3000);
  } catch (err) {
    console.warn('[Calendar Deletion Error]', err);
    dispatch({ type: 'SET_CALENDAR_STATUS', status: 'error' });
    setTimeout(() => dispatch({ type: 'SET_CALENDAR_STATUS', status: null }), 4000);
  }
}
