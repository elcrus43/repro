/**
 * supabaseSync.js — вся логика синхронизации с Supabase.
 *
 * Вынесена из AppContext.jsx для:
 *  - разделения ответственности (SRP)
 *  - удобного тестирования
 *  - устранения God Object
 *
 * ИЗМЕНЕНИЯ vs оригинала:
 *  1. Убран alert() — заменён на onError callback (передаётся из AppContext)
 *  2. Добавлен rollback callback — вызывается при критической ошибке
 *     чтобы откатить optimistic update
 *  3. Добавлен retry с экспоненциальной задержкой для сетевых ошибок
 */

import { supabase } from '../lib/supabase';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

/**
 * Рекурсивно заменяет пустые строки на null перед отправкой в БД.
 * Supabase/PostgreSQL воспринимает '' и NULL по-разному в NOT NULL полях.
 */
export function sanitizeObj(obj) {
  if (obj === '') return null;
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObj);

  const sanitized = { ...obj };
  for (const key in sanitized) {
    if (sanitized[key] === '') {
      sanitized[key] = null;
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObj(sanitized[key]);
    }
  }
  return sanitized;
}

/**
 * Retry-обёртка для сетевых сбоев.
 * Не повторяет запрос при ошибках доступа (RLS) или схемы.
 */
async function withRetry(fn, { retries = 2, delay = 500 } = {}) {
  const NON_RETRYABLE_CODES = ['42501', 'PGRST301', 'PGRST116', '42703', 'PGRST204'];
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fn();
      // Supabase возвращает error внутри объекта, а не бросает исключение
      if (result?.error && NON_RETRYABLE_CODES.includes(result.error.code)) {
        return result; // не ретраим — это не сетевая ошибка
      }
      if (result?.error && attempt < retries) {
        await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt)));
        lastError = result;
        continue;
      }
      return result;
    } catch (err) {
      lastError = { error: err };
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt)));
      }
    }
  }
  return lastError;
}

/* ─── Loader ───────────────────────────────────────────────────────────────── */

/**
 * Загружает все данные пользователя из Supabase параллельно.
 */
export async function loadUserData(userId, role) {
  const isAdmin = role === 'admin';

  const [clientsRes, propertiesRes, requestsRes, matchesRes, showingsRes, tasksRes, priceRes] =
    await Promise.all([
      supabase.from('clients').select('*'),
      supabase.from('properties').select('*'),
      supabase.from('requests').select('*'),
      supabase.from('matches').select('*'),
      supabase.from('showings').select('*'),
      isAdmin
        ? supabase.from('tasks').select('*')
        : supabase.from('tasks').select('*').eq('realtor_id', userId),
      supabase.from('pricelist').select('*'),
    ]);

  const { data: profiles } = await supabase.from('profiles').select('*');

  const pendingUsers = isAdmin
    ? profiles?.filter(p => ['pending', 'rejected'].includes(p.status)) ?? []
    : [];

  return {
    clients: clientsRes.data ?? [],
    properties: propertiesRes.data ?? [],
    requests: requestsRes.data ?? [],
    matches: matchesRes.data ?? [],
    showings: showingsRes.data ?? [],
    tasks: tasksRes.data ?? [],
    profiles: profiles ?? [],
    pendingUsers,
    pricelist: priceRes?.data ?? [],
    error:
      clientsRes.error?.message ||
      propertiesRes.error?.message ||
      requestsRes.error?.message ||
      priceRes?.error?.message ||
      null,
  };
}

/* ─── Sync ─────────────────────────────────────────────────────────────────── */

/**
 * syncAction — отправляет изменение в Supabase.
 *
 * @param {object} rawAction      — действие после enhance (из useDbDispatch)
 * @param {function} onError      — (message: string) => void  — заменяет alert()
 * @param {function} onRollback   — (action: object) => void   — откат optimistic update
 */
export async function syncAction(rawAction, { onError, onRollback, currentUser } = {}) {
  const handleError = onError ?? ((msg) => console.error('[Supabase]', msg));

  try {
    const action = sanitizeObj(rawAction);
    let result;

    // ─── RBAC: Проверка прав для админских действий ─────────────────────
    const ADMIN_ONLY_ACTIONS = ['APPROVE_USER', 'REJECT_USER', 'ADD_PRICE_ITEM', 'UPDATE_PRICE_ITEM', 'DELETE_PRICE_ITEM'];
    
    if (ADMIN_ONLY_ACTIONS.includes(action.type)) {
      if (!currentUser || currentUser.role !== 'admin') {
        handleError(`Доступ запрещён: действие ${action.type} требует прав администратора`);
        return; // Не выполняем действие
      }
    }

    switch (action.type) {

      /* ── Профиль ─────────────────────────────────────────────────────── */
      case 'UPDATE_PROFILE': {
        const { id, full_name, phone, agency_name } = action.profile;
        result = await withRetry(() =>
          supabase.from('profiles').update({ full_name: full_name || '', phone: phone || '', agency_name: agency_name || '' }).eq('id', id)
        );
        break;
      }

      /* ── Клиенты ─────────────────────────────────────────────────────── */
      case 'ADD_CLIENT': {
        // Normalize client data
        const clientData = {
          ...action.client,
          client_types: action.client.client_types || ['buyer'],
          additional_contacts: action.client.additional_contacts || [],
          passport_details: action.client.passport_details || null,
          source: action.client.source || null,
          notes: action.client.notes || null,
        };
        // Remove undefined fields
        Object.keys(clientData).forEach(key => {
          if (clientData[key] === undefined) delete clientData[key];
        });

        result = await withRetry(() => supabase.from('clients').insert(clientData));

        // Ретрай без passport_details при ошибке схемы (hotfix для старых БД)
        if (_isPassportColumnError(result?.error)) {
          console.warn('[Supabase] passport_details column missing, retrying without it');
          const { passport_details: _pd, ...clientWithout } = clientData;
          result = await withRetry(() => supabase.from('clients').insert(clientWithout));
        }
        break;
      }

      case 'UPDATE_CLIENT': {
        const { id: cId, ...cData } = action.client;
        // Normalize client data
        const normalizedData = {
          ...cData,
          client_types: cData.client_types || ['buyer'],
          additional_contacts: cData.additional_contacts || [],
          passport_details: cData.passport_details || null,
          source: cData.source || null,
          notes: cData.notes || null,
        };
        // Remove undefined fields
        Object.keys(normalizedData).forEach(key => {
          if (normalizedData[key] === undefined) delete normalizedData[key];
        });

        result = await withRetry(() => supabase.from('clients').update(normalizedData).eq('id', cId));

        if (_isPassportColumnError(result?.error)) {
          console.warn('[Supabase] passport_details column missing, retrying without it');
          const { passport_details: _pd, ...dataWithout } = normalizedData;
          result = await withRetry(() => supabase.from('clients').update(dataWithout).eq('id', cId));
        }
        break;
      }

      case 'DELETE_CLIENT':
        result = await withRetry(() => supabase.from('clients').delete().eq('id', action.id));
        break;

      /* ── Объекты ─────────────────────────────────────────────────────── */
      case 'ADD_PROPERTY': {
        // Normalize property data - handle missing columns gracefully
        const propertyData = {
          ...action.property,
          // Ensure required fields exist
          deal_type: action.property.deal_type || 'sale',
          property_type: action.property.property_type || 'apartment',
          floors_total: action.property.floors_total || 9,
          build_year: action.property.build_year || new Date().getFullYear(),
          city: action.property.city || 'Киров',
          district: action.property.district || null,
          microdistrict: action.property.microdistrict || null,
          price_min: action.property.price_min || null,
          notes: action.property.notes || null,
          images: action.property.images || [],
          commission: action.property.commission ?? 0,
        };
        // Remove undefined fields to avoid schema errors
        Object.keys(propertyData).forEach(key => {
          if (propertyData[key] === undefined) delete propertyData[key];
        });

        result = await withRetry(() => supabase.from('properties').insert(propertyData));

        // Retry without notes if column missing
        if (result?.error && result.error.message?.includes('notes')) {
          console.warn('[Supabase] notes column missing, retrying without it');
          const { notes: _n, ...propertyWithoutNotes } = propertyData;
          result = await withRetry(() => supabase.from('properties').insert(propertyWithoutNotes));
        }
        // Retry without images if column missing
        if (result?.error && result.error.message?.includes('images')) {
          console.warn('[Supabase] images column missing, retrying without it');
          const { images: _i, ...propertyWithoutImages } = propertyData;
          result = await withRetry(() => supabase.from('properties').insert(propertyWithoutImages));
        }

        if (!result?.error && action.matches?.length > 0) {
          const matchResult = await withRetry(() => supabase.from('matches').upsert(action.matches));
          if (matchResult?.error) console.error('[Supabase Match Sync Error]', matchResult.error);
        }
        break;
      }

      case 'UPDATE_PROPERTY': {
        const { id: pId, ...pData } = action.property;
        // Normalize and clean property data
        const normalizedData = {
          ...pData,
          deal_type: pData.deal_type || 'sale',
          property_type: pData.property_type || 'apartment',
          floors_total: pData.floors_total || 9,
          build_year: pData.build_year || new Date().getFullYear(),
          city: pData.city || 'Киров',
          district: pData.district || null,
          microdistrict: pData.microdistrict || null,
          price_min: pData.price_min || null,
          notes: pData.notes || null,
          images: pData.images || [],
          commission: pData.commission ?? 0,
        };
        // Remove undefined fields
        Object.keys(normalizedData).forEach(key => {
          if (normalizedData[key] === undefined) delete normalizedData[key];
        });

        result = await withRetry(() => supabase.from('properties').update(normalizedData).eq('id', pId));

        // Retry without notes if column missing
        if (result?.error && result.error.message?.includes('notes')) {
          console.warn('[Supabase] notes column missing, retrying without it');
          const { notes: _n, ...dataWithoutNotes } = normalizedData;
          result = await withRetry(() => supabase.from('properties').update(dataWithoutNotes).eq('id', pId));
        }
        // Retry without images if column missing
        if (result?.error && result.error.message?.includes('images')) {
          console.warn('[Supabase] images column missing, retrying without it');
          const { images: _i, ...dataWithoutImages } = normalizedData;
          result = await withRetry(() => supabase.from('properties').update(dataWithoutImages).eq('id', pId));
        }

        if (!result?.error && action.matches?.length > 0) {
          const matchResult = await withRetry(() => supabase.from('matches').upsert(action.matches));
          if (matchResult?.error) console.error('[Supabase Match Sync Error]', matchResult.error);
        }
        break;
      }

      case 'DELETE_PROPERTY':
        result = await withRetry(() => supabase.from('properties').delete().eq('id', action.id));
        break;

      /* ── Запросы ─────────────────────────────────────────────────────── */
      case 'ADD_REQUEST':
      case 'UPDATE_REQUEST':
        result = await withRetry(() => supabase.from('requests').upsert(action.request));
        if (!result?.error && action.matches?.length > 0) {
          const matchResult = await withRetry(() => supabase.from('matches').upsert(action.matches));
          if (matchResult?.error) console.error('[Supabase Match Sync Error]', matchResult.error);
        }
        break;

      case 'DELETE_REQUEST':
        result = await withRetry(() => supabase.from('requests').delete().eq('id', action.id));
        break;

      /* ── Матчи ───────────────────────────────────────────────────────── */
      case 'UPDATE_MATCH':
        result = await withRetry(() => supabase.from('matches').upsert(action.match));
        break;

      /* ── Закрытие сделки ─────────────────────────────────────────────── */
      case 'CLOSE_DEAL': {
        const { matchId, propertyId, requestId, now } = action;
        const results = await Promise.all([
          supabase.from('matches').update({ status: 'deal', updated_at: now }).eq('id', matchId),
          supabase.from('matches').update({ status: 'rejected', updated_at: now }).eq('property_id', propertyId).neq('id', matchId),
          supabase.from('matches').update({ status: 'rejected', updated_at: now }).eq('request_id', requestId).neq('id', matchId),
          supabase.from('properties').update({ status: 'sold', updated_at: now }).eq('id', propertyId),
          supabase.from('requests').update({ status: 'found', updated_at: now }).eq('id', requestId),
        ]);
        results.forEach((res, i) => {
          if (res.error) console.error(`[Supabase Deal Sync Error ${i}]`, res.error);
        });
        return; // Ранний выход — нет единственного result для проверки
      }

      /* ── Показы ──────────────────────────────────────────────────────── */
      case 'ADD_SHOWING': {
        const queries = [withRetry(() => supabase.from('showings').upsert(action.showing))];
        if (action.task) queries.push(withRetry(() => supabase.from('tasks').upsert(action.task)));
        if (action.matches && action.showing.match_id) {
          const match = action.matches.find(m => m.id === action.showing.match_id);
          if (match) queries.push(withRetry(() => supabase.from('matches').upsert(match)));
        }
        const results = await Promise.all(queries);
        results.forEach((res, i) => {
          if (res?.error) console.error(`[Supabase Showing Sync Error ${i}]`, res.error);
        });
        return;
      }

      case 'UPDATE_SHOWING': {
        const queries = [withRetry(() => supabase.from('showings').upsert(action.showing))];
        if (action.matches) queries.push(withRetry(() => supabase.from('matches').upsert(action.matches)));
        const results = await Promise.all(queries);
        results.forEach((res, i) => {
          if (res?.error) console.error(`[Supabase Showing Update Error ${i}]`, res.error);
        });
        return;
      }

      case 'DELETE_SHOWING':
        result = await withRetry(() => supabase.from('showings').delete().eq('id', action.id));
        break;

      /* ── Задачи ──────────────────────────────────────────────────────── */
      case 'ADD_TASK':
      case 'UPDATE_TASK':
        result = await withRetry(() => supabase.from('tasks').upsert(action.task));
        break;

      case 'DELETE_TASK':
        result = await withRetry(() => supabase.from('tasks').delete().eq('id', action.id));
        break;

      /* ── Пользователи (admin) ────────────────────────────────────────── */
      case 'APPROVE_USER':
        result = await withRetry(() => supabase.from('profiles').update({ status: 'approved' }).eq('id', action.userId));
        break;

      case 'REJECT_USER':
        result = await withRetry(() => supabase.from('profiles').update({ status: 'rejected' }).eq('id', action.userId));
        break;

      /* ── Прайс-лист ──────────────────────────────────────────────────── */
      case 'ADD_PRICE_ITEM':
        result = await withRetry(() => supabase.from('pricelist').insert(action.item));
        break;

      case 'UPDATE_PRICE_ITEM':
        result = await withRetry(() =>
          supabase.from('pricelist')
            .update({ name: action.item.name, price: action.item.price, show_in_sale: action.item.show_in_sale, show_in_purchase: action.item.show_in_purchase })
            .eq('id', action.item.id)
        );
        break;

      case 'DELETE_PRICE_ITEM':
        result = await withRetry(() => supabase.from('pricelist').delete().eq('id', action.id));
        break;

      default:
        return; // Неизвестный тип — ничего не делаем
    }

    /* ── Обработка финальной ошибки ──────────────────────────────────── */
    if (result?.error) {
      console.error('[Supabase Sync Error]', action.type, result.error);

      // Check for missing column error
      const missingColumnMatch = result.error.message.match(/Could not find the '(\w+)' column/);

      if (result.error.code === '42501') {
        // RLS — ошибка доступа
        handleError('Ошибка доступа (RLS): у вашей роли нет прав на это действие.');
      } else if (missingColumnMatch) {
        // Missing column - provide helpful message
        const columnName = missingColumnMatch[1];
        handleError(
          `Отсутствует колонка "${columnName}" в базе данных. ` +
          `Необходимо выполнить миграцию БД. ` +
          `Обратитесь к файлу: backend/migrations/check_and_fix_properties.sql`
        );
      } else {
        // Прочие ошибки
        handleError(`Ошибка сохранения: ${result.error.message}`);
        if (typeof onRollback === 'function') {
          onRollback(action);
        }
      }
    }

  } catch (err) {
    console.error('[Supabase Critical Error]', rawAction.type, err);
    handleError('Критическая ошибка соединения с базой данных. Проверьте подключение к интернету.');
    if (typeof onRollback === 'function') {
      onRollback(rawAction);
    }
  }
}

/* ─── Private Helpers ──────────────────────────────────────────────────────── */

function _isPassportColumnError(error) {
  return (
    error &&
    (error.code === '42703' || error.code === 'PGRST204') &&
    error.message?.includes('passport_details')
  );
}
