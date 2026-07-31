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

import { neonDb } from '../lib/neon';
import {
  addEventToCalendar,
  updateEventInCalendar,
  deleteEventFromCalendar,
  isCalendarConfigured,
  isCalendarConnected,
} from '../lib/googleCalendar';

const EVENT_TYPE_LABELS = {
  showing: 'Показ',
  meeting: 'Встреча',
  viewing: 'Подбор',
  deposit: 'Задаток',
  deal: 'Сделка',
  call: 'Звонок',
};


export function getRawGoogleEventId(googleEventId) {
  if (!googleEventId || typeof googleEventId !== 'string') return null;
  if (googleEventId.includes('::cal_id:')) {
    const parts = googleEventId.split('::cal_id:');
    return parts[1] || null;
  }
  if (googleEventId.startsWith('selection_prop_id:')) {
    return null;
  }
  return googleEventId;
}

async function updateGoogleEventId(table, item, eventId) {
  const id = item.id;
  let dbEventId = eventId;
  
  if (table === 'showings' && item.event_type === 'viewing') {
    const propId = item.property_id;
    if (propId) {
      dbEventId = eventId ? `selection_prop_id:${propId}::cal_id:${eventId}` : `selection_prop_id:${propId}`;
    }
  }

  await neonDb.update(table, id, { google_event_id: dbEventId });
}

/**
 * Синхронизирует задачу, показ или сделку с Google Calendar.
 *
 * @param {string}   actionType  — тип действия ('ADD_TASK', 'UPDATE_SHOWING', 'ADD_DEAL' и т.д.)
 * @param {object}   item        — задача, показ или сделка (после enhance)
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
  if (!isCalendarConnected()) {
    console.info('[Google Calendar Sync] Skipped — no active token (connect Google Calendar in Profile)');
    return;
  }

  const isShowing = actionType.includes('SHOWING');
  const isDeal = actionType.includes('DEAL');
  const table = isShowing ? 'showings' : isDeal ? 'deals' : 'tasks';
  const updateKey = isShowing ? 'showing' : isDeal ? 'deal' : 'task';
  const updateType = isShowing ? 'UPDATE_SHOWING' : isDeal ? 'UPDATE_DEAL' : 'UPDATE_TASK';

  const date = item.due_date || item.showing_date || item.deal_date;
  // Заголовок: "Тип события: Адрес объекта" или "Тип события: дата" если адреса нет
  const eventTypeLabel = EVENT_TYPE_LABELS[item.event_type] || 'Событие';
  const clientName = item._clientName || item.contact_name || '';
  const defaultTitle = isShowing
    ? item.event_type === 'viewing'
      ? 'Подбор'
      : item._propertyAddress
      ? `${eventTypeLabel}: ${item._propertyAddress}${clientName ? ' (' + clientName + ')' : ''}`
      : `${eventTypeLabel}${clientName ? ' — ' + clientName : ''}`
    : isDeal
    ? `Сделка: ${item.title || ''}`
    : `Задача: ${item.title || ''}`;
  const title = isDeal ? `Сделка: ${item.title || ''}` : (item.title || defaultTitle);
  
  // Описание события — дата + адрес + заметки
  const dateStr = date ? new Date(date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const descParts = [];
  if (dateStr) descParts.push(`📅 ${dateStr}`);
  if (item._propertyAddress) descParts.push(`🏠 ${item._propertyAddress}`);
  if (isDeal) {
    if (item.price) descParts.push(`💰 Цена: ${Number(item.price).toLocaleString('ru-RU')} ₽`);
    if (item.lawyer) descParts.push(`👤 Юрист: ${item.lawyer}`);
    if (item.notes) descParts.push(`📝 Заметки: ${item.notes}`);
    if (item.expenses && item.expenses.length > 0) {
      const expList = item.expenses.map(e => `  - ${e.title}: ${Number(e.amount).toLocaleString('ru-RU')} ₽ (${e.payer === 'seller' ? 'продавец' : 'покупатель'})`).join('\n');
      descParts.push(`📉 Расходы:\n${expList}`);
    }
  } else {
    if (item.description) descParts.push(`📝 ${item.description}`);
  }
  const description = descParts.join('\n');

  const rawId = getRawGoogleEventId(item.google_event_id);

  // Нет даты и нет существующего события — ничего не делаем
  if (!date && !rawId) {
    console.info('[Google Calendar Sync] No date and no existing event — skipping');
    return;
  }

  console.info('[Google Calendar Sync] Starting sync:', { actionType, itemId: item.id, title, date, existingEventId: rawId });

  dispatch({ type: 'SET_CALENDAR_STATUS', status: 'loading' });

  try {
    if (rawId && !date) {
      // Дата убрана — удаляем событие из Calendar
      console.info('[Google Calendar Sync] Deleting event:', rawId);
      await deleteEventFromCalendar(rawId);
      await updateGoogleEventId(table, item, null);
      dispatch({ type: updateType, [updateKey]: { ...item, google_event_id: null } });

    } else if (rawId) {
      // Событие уже есть — обновляем в Google Календаре
      console.info('[Google Calendar Sync] Updating event:', rawId);
      await updateEventInCalendar(rawId, { title, description, startDateTime: date });

    } else if (date) {
      // Нового события нет — создаём событие в Google Календаре
      console.info('[Google Calendar Sync] Creating new event:', { title, date });
      const calEvent = await addEventToCalendar({ title, description, startDateTime: date });
      console.info('[Google Calendar Sync] Event created:', calEvent);
      if (calEvent?.id) {
        await updateGoogleEventId(table, item, calEvent.id);
        dispatch({ type: updateType, [updateKey]: { ...item, google_event_id: calEvent.id } });
        console.info('[Google Calendar Sync] Event ID saved to database:', calEvent.id);
      }
    }

    dispatch({ type: 'SET_CALENDAR_STATUS', status: 'ok' });
    setTimeout(() => dispatch({ type: 'SET_CALENDAR_STATUS', status: null }), 3000);

  } catch (err) {
    console.error('[Google Calendar Sync Error]', err);
    // Не блокируем создание задачи/сделки — ошибка только в статусе
    dispatch({ type: 'SET_CALENDAR_STATUS', status: 'error', errorMessage: err.message || 'Неизвестная ошибка' });
    setTimeout(() => dispatch({ type: 'SET_CALENDAR_STATUS', status: null, errorMessage: null }), 5000);
  }
}

/**
 * Удаляет событие Google Calendar при удалении задачи, показа или сделки.
 *
 * @param {object|undefined} item     — задача, показ или сделка из текущего state
 * @param {function}         dispatch — диспатч для статуса
 */
export async function deleteCalendarEvent(item, dispatch) {
  const rawId = getRawGoogleEventId(item?.google_event_id);
  if (!rawId) return;

  dispatch({ type: 'SET_CALENDAR_STATUS', status: 'loading' });

  try {
    await deleteEventFromCalendar(rawId);
    dispatch({ type: 'SET_CALENDAR_STATUS', status: 'ok' });
    setTimeout(() => dispatch({ type: 'SET_CALENDAR_STATUS', status: null }), 3000);
  } catch (err) {
    console.warn('[Calendar Deletion Error]', err);
    dispatch({ type: 'SET_CALENDAR_STATUS', status: 'error' });
    setTimeout(() => dispatch({ type: 'SET_CALENDAR_STATUS', status: null }), 4000);
  }
}
