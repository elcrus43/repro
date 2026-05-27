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
  isCalendarConfigured,
  isCalendarConnected,
} from '../lib/googleCalendar';

const EVENT_TYPE_LABELS = {
  showing: 'Показ',
  meeting: 'Встреча с собственником',
  viewing: 'Просмотр',
  deposit: 'Задаток',
  deal: 'Сделка',
  call: 'Звонок',
};

/**
 * Синхронизирует задачу или показ с Google Calendar.
 *
 * @param {string}   actionType  — тип действия ('ADD_TASK', 'UPDATE_SHOWING', и т.д.)
 * @param {object}   item        — задача или показ (после enhance)
 * @param {function} dispatch    — диспатч для обновления calendarStatus и google_event_id
 */
export async function syncWithCalendar(actionType, item, dispatch) {
  if (!item) return;

  // Если Google Calendar не настроен — тихо выходим (не блокируем работу)
  if (!isCalendarConfigured()) {
    console.info('[Google Calendar Sync] Not configured — set VITE_GOOGLE_CLIENT_ID in .env');
    return;
  }

  // Если токен не активен — пропускаем синхронизацию без ошибки.
  // requestAccessToken() без активной сессии попытается открыть popup Google,
  // что заблокировано браузером (нет user gesture) и ведёт к 30с timeout.
  if (!isCalendarConnected()) {
    console.info('[Google Calendar Sync] Skipped — no active token (connect Google Calendar in Profile)');
    return;
  }

  const isShowing = actionType.includes('SHOWING');
  const table = isShowing ? 'showings' : 'tasks';
  const updateKey = isShowing ? 'showing' : 'task';
  const updateType = isShowing ? 'UPDATE_SHOWING' : 'UPDATE_TASK';

  const date = item.due_date || item.showing_date;
  // Заголовок: "Тип события: Адрес объекта" или "Тип события: дата" если адреса нет
  const eventTypeLabel = EVENT_TYPE_LABELS[item.event_type] || 'Событие';
  const defaultTitle = isShowing
    ? item._propertyAddress
      ? `${eventTypeLabel}: ${item._propertyAddress}`
      : `${eventTypeLabel}${item.showing_date ? ': ' + new Date(item.showing_date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}`
    : `Задача: ${item.title || (item.due_date ? new Date(item.due_date).toLocaleDateString('ru-RU') : '')}`;
  const title = item.title || defaultTitle;
  // Описание события — дата + адрес + заметки
  const dateStr = date ? new Date(date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const descParts = [];
  if (dateStr) descParts.push(`📅 ${dateStr}`);
  if (item._propertyAddress) descParts.push(`🏠 ${item._propertyAddress}`);
  if (item.description) descParts.push(`📝 ${item.description}`);
  const description = descParts.join('\n');

  // Нет даты и нет существующего события — ничего не делаем
  if (!date && !item.google_event_id) {
    console.info('[Google Calendar Sync] No date and no existing event — skipping');
    return;
  }

  console.info('[Google Calendar Sync] Starting sync:', { actionType, itemId: item.id, title, date, existingEventId: item.google_event_id });

  dispatch({ type: 'SET_CALENDAR_STATUS', status: 'loading' });

  try {
    if (item.google_event_id && !date) {
      // Дата убрана — удаляем событие из Calendar
      console.info('[Google Calendar Sync] Deleting event:', item.google_event_id);
      await deleteEventFromCalendar(item.google_event_id);
      await supabase.from(table).update({ google_event_id: null }).eq('id', item.id);
      dispatch({ type: updateType, [updateKey]: { ...item, google_event_id: null } });

    } else if (item.google_event_id) {
      // Событие уже есть — обновляем
      console.info('[Google Calendar Sync] Updating event:', item.google_event_id);
      await updateEventInCalendar(item.google_event_id, { title, description, startDateTime: date });

    } else if (date) {
      // Нового события нет — создаём
      console.info('[Google Calendar Sync] Creating new event:', { title, date });
      const calEvent = await addEventToCalendar({ title, description, startDateTime: date });
      console.info('[Google Calendar Sync] Event created:', calEvent);
      if (calEvent?.id) {
        await supabase.from(table).update({ google_event_id: calEvent.id }).eq('id', item.id);
        dispatch({ type: updateType, [updateKey]: { ...item, google_event_id: calEvent.id } });
        console.info('[Google Calendar Sync] Event ID saved to database:', calEvent.id);
      }
    }

    dispatch({ type: 'SET_CALENDAR_STATUS', status: 'ok' });
    setTimeout(() => dispatch({ type: 'SET_CALENDAR_STATUS', status: null }), 3000);

  } catch (err) {
    console.error('[Google Calendar Sync Error]', err);
    // Не блокируем создание задачи — ошибка только в статусе
    dispatch({ type: 'SET_CALENDAR_STATUS', status: 'error', errorMessage: err.message || 'Неизвестная ошибка' });
    setTimeout(() => dispatch({ type: 'SET_CALENDAR_STATUS', status: null, errorMessage: null }), 5000);
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
