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
  // Массивы (client_ids и др.) обрабатываем без UUID-проверки элементов
  if (Array.isArray(obj)) return obj.map(item => {
    if (typeof item === 'string') return item === '' ? null : item; // строки в массивах не заменяем null, кроме пустых строк
    return sanitizeObj(item);
  });

  const UUID_FIELDS = new Set(['id', 'client_id', 'realtor_id', 'property_id', 'request_id']);
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const sanitized = { ...obj };
  Object.keys(sanitized).forEach(key => {
    const val = sanitized[key];

    // UUID-поля: заменяем невалидный UUID null — но не для client_ids!
    if (UUID_FIELDS.has(key) && key !== 'id' &&
        typeof val === 'string' && val.length > 0 && !UUID_RE.test(val)) {
      console.warn(`[Supabase] Stripping invalid UUID for field ${key}:`, val);
      sanitized[key] = null;
      return;
    }

    if (val === '') {
      sanitized[key] = null;
    } else if (Array.isArray(val)) {
      // Массивы (client_ids, images и др.) обрабатываем через рекурсию без UUID-замены
      sanitized[key] = val.map(item => {
        if (typeof item === 'string') return item === '' ? null : item; // строки (UUID, URL) — не трогаем, кроме пустых строк
        return sanitizeObj(item);
      });
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeObj(val);
    }
  });
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
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    );

    try {
      // Race the actual function against the timeout
      const result = await Promise.race([fn(), timeoutPromise]);
      
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
      const isTimeout = err.message === 'TIMEOUT';
      lastError = { error: { message: isTimeout ? 'Превышено время ожидания (30с)' : err.message, code: isTimeout ? 'TIMEOUT' : 'NETWORK' } };
      
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt)));
      }
    }
  }
  return lastError;
}

/* ─── Loader ───────────────────────────────────────────────────────────────── */

/**
 * Загружает все данные пользователя из Supabase.
 * Оптимизировано для мобильных браузеров (Chrome Android):
 *  - AbortController вместо Promise.race (совместимо с Supabase)
 *  - Пакетная загрузка вместо 8 параллельных запросов
 *  - Retry при сетевых сбоях
 */
export async function loadUserData(userId, role) {
  const isAdmin = role === 'admin';

  async function safeQuery(queryFn, name, timeoutMs = 60000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      console.warn(`[safeQuery] Start query for: ${name}`);
      const start = Date.now();
      const res = await queryFn(controller.signal);
      const duration = Date.now() - start;
      console.warn(`[safeQuery] Completed query for: ${name} in ${duration}ms. Success: ${res?.error == null}`);
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      const isAbort = e?.name === 'AbortError' || e?.message === 'aborted' || controller.signal.aborted;
      const message = isAbort
        ? 'Превышено время ожидания (30с)'
        : (e?.message || 'Сетевая ошибка');
      console.warn(`[safeQuery] Failed query for: ${name}. Error: ${message}`, e);
      return { data: null, error: { message, code: isAbort ? 'TIMEOUT' : 'NETWORK' } };
    }
  }

  // Загружаем все 9 таблиц полностью параллельно (оптимально для HTTP/2)
  // properties и requests — загружаем ВСЕ (для матчинга между риэлторами)
  // clients, showings, tasks, deals — только свои
  const [
    clientsRes, propertiesRes, requestsRes, matchesRes,
    showingsRes, tasksRes, priceRes, dealsRes, profilesRes
  ] = await Promise.all([
    isAdmin
      ? safeQuery((signal) => supabase.from('clients').select('*').abortSignal(signal), 'clients')
      : safeQuery((signal) => supabase.from('clients').select('*').eq('realtor_id', userId).abortSignal(signal), 'clients'),
    // Все объекты видны всем риэлторам (нужно для матчинга и совместной работы)
    safeQuery((signal) => supabase.from('properties').select('*').abortSignal(signal), 'properties'),
    // Все запросы видны всем риэлторам (нужно для матчинга)
    safeQuery((signal) => supabase.from('requests').select('*').abortSignal(signal), 'requests'),
    isAdmin
      ? safeQuery((signal) => supabase.from('matches').select('*').abortSignal(signal), 'matches')
      : safeQuery((signal) => supabase.from('matches').select('*').eq('realtor_id', userId).abortSignal(signal), 'matches'),
    isAdmin
      ? safeQuery((signal) => supabase.from('showings').select('*').abortSignal(signal), 'showings')
      : safeQuery((signal) => supabase.from('showings').select('*').eq('realtor_id', userId).abortSignal(signal), 'showings'),
    isAdmin
      ? safeQuery((signal) => supabase.from('tasks').select('*').abortSignal(signal), 'tasks')
      : safeQuery((signal) => supabase.from('tasks').select('*').eq('realtor_id', userId).abortSignal(signal), 'tasks'),
    safeQuery((signal) => supabase.from('pricelist').select('*').abortSignal(signal), 'pricelist'),
    isAdmin
      ? safeQuery((signal) => supabase.from('deals').select('*').abortSignal(signal), 'deals')
      : safeQuery((signal) => supabase.from('deals').select('*').eq('realtor_id', userId).abortSignal(signal), 'deals'),
    safeQuery((signal) => supabase.from('profiles').select('*').abortSignal(signal), 'profiles'),
  ]);

  const profiles = profilesRes?.data ?? [];
  const pendingUsers = isAdmin
    ? profiles.filter(p => ['pending', 'rejected'].includes(p.status))
    : [];

  const errors = [
    clientsRes.error, propertiesRes.error, requestsRes.error,
    matchesRes.error, showingsRes.error, tasksRes.error,
    priceRes?.error, dealsRes?.error, profilesRes?.error
  ].filter(Boolean).map(e => e.message);

  if (errors.length > 0) {
    console.warn('[loadUserData] Partial errors:', errors);
  }

  const allFailed = [clientsRes, propertiesRes, requestsRes, matchesRes].every(r => r.error != null);

  return {
    clients:     clientsRes.data ?? [],
    properties:  propertiesRes.data ?? [],
    requests:    requestsRes.data ?? [],
    matches:     matchesRes.data ?? [],
    showings:    showingsRes.data ?? [],
    tasks:       tasksRes.data ?? [],
    profiles:    profiles ?? [],
    pendingUsers,
    pricelist:   priceRes?.data ?? [],
    deals:       dealsRes?.data ?? [],
    error: errors.length > 0 ? errors.join('; ') : null,
    allFailed,
  };
}

/* ─── Persistent Cache ──────────────────────────────────────────────────────── */
// Ключ кеша per-user чтобы не смешивать данные разных риелторов
const CACHE_KEY = (userId) => `rm_cache_${userId}`;
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 часов — для быстрого запуска и оффлайн-работы

export function getCachedData(userId) {
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

export function setCachedData(userId, data) {
  try {
    localStorage.setItem(CACHE_KEY(userId), JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // localStorage может быть недоступен в приватном режиме — не критично
  }
}

export function clearCachedData(userId) {
  try {
    if (userId) localStorage.removeItem(CACHE_KEY(userId));
  } catch { /* ignore */ }
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
        const { id, full_name, phone, agency_name, inn } = action.profile;
        const updateData = { full_name: full_name || '', phone: phone || '', agency_name: agency_name || '' };
        if (inn !== undefined) updateData.inn = inn || null;
        result = await withRetry(() =>
          supabase.from('profiles').update(updateData).eq('id', id)
        );
        break;
      }

      /* ── Клиенты ─────────────────────────────────────────────────────── */
      case 'ADD_CLIENT': {
        // Normalize client data
        const clientData = {
          ...action.client,
          // Extract phone from phones array if present
          phone: action.client.phone || (action.client.phones && action.client.phones[0]) || '',
          phone_2: (action.client.phones && action.client.phones.length > 1) ? action.client.phones[1] : (action.client.phone_2 || ''),
          client_types: action.client.client_types || ['buyer'],
          additional_contacts: action.client.additional_contacts || [],
          passport_details: action.client.passport_details || null,
          source: action.client.source || null,
          notes: action.client.notes || null,
        };
        // Remove phones array (not in schema) and undefined fields
        delete clientData.phones;
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
          // Extract phone from phones array if present
          phone: cData.phone || (cData.phones && cData.phones[0]) || '',
          phone_2: (cData.phones && cData.phones.length > 1) ? cData.phones[1] : (cData.phone_2 || ''),
          client_types: cData.client_types || ['buyer'],
          additional_contacts: cData.additional_contacts || [],
          passport_details: cData.passport_details || null,
          source: cData.source || null,
          notes: cData.notes || null,
        };
        // Remove phones array (not in schema) and undefined fields
        delete normalizedData.phones;
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
          client_ids: action.property.client_ids || (action.property.client_id ? [action.property.client_id] : []),
          client_id: (action.property.client_ids && action.property.client_ids.length > 0) 
            ? action.property.client_ids[0] 
            : (action.property.client_id || null),
          portfolio_analog_links: action.property.portfolio_analog_links || [],
        };
        // Remove legacy field
        delete propertyData.mortgage_calc_image;
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
        // Retry without new fields if columns are missing (migration 032 not applied)
        if (result?.error && _isNewPropertyColumnError(result.error)) {
          console.warn('[Supabase] New property columns missing. Retrying without specific missing fields.');
          const stripped = _stripNewPropertyFields(propertyData, result.error);
          result = await withRetry(() => supabase.from('properties').insert(stripped));
        }

        if (!result?.error && action.matches?.length > 0) {
          const matchResult = await withRetry(() => supabase.from('matches').upsert(action.matches));
          if (matchResult?.error) console.error('[Supabase Match Sync Error]', matchResult.error);
        }
        break;
      }

      case 'UPDATE_PROPERTY': {
        // Handle both { property: { ... } } and { id, data } formats
        const rawProp = action.property || { ...action.data, id: action.id };
        const propertyData = sanitizeObj(rawProp);
        const { id: pId, ...pData } = propertyData;
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
          client_ids: pData.client_ids || (pData.client_id ? [pData.client_id] : []),
          client_id: (pData.client_ids && pData.client_ids.length > 0)
            ? pData.client_ids[0]
            : (pData.client_id || null),
          portfolio_analog_links: pData.portfolio_analog_links || [],
        };
        // Remove legacy field
        delete normalizedData.mortgage_calc_image;
        // Remove undefined fields
        Object.keys(normalizedData).forEach(key => {
          if (normalizedData[key] === undefined) delete normalizedData[key];
        });

        result = await withRetry(() => supabase.from('properties').update(normalizedData).eq('id', pId));
        if (result?.error) console.error('[UPDATE_PROPERTY ERROR]', JSON.stringify(result.error));

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
        // Retry without new fields if columns are missing (migration 032 not applied)
        if (result?.error && _isNewPropertyColumnError(result.error)) {
          console.warn('[Supabase] New property columns missing. Retrying without specific missing fields.');
          const stripped = _stripNewPropertyFields(normalizedData, result.error);
          result = await withRetry(() => supabase.from('properties').update(stripped).eq('id', pId));
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
        
        if (result?.error && _isNewRequestColumnError(result.error)) {
          console.warn('[Supabase] New request columns missing. Retrying without specific missing fields.');
          const stripped = _stripNewRequestFields(action.request, result.error);
          result = await withRetry(() => supabase.from('requests').upsert(stripped));
        }

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

      case 'DELETE_MATCH':
        result = await withRetry(() => supabase.from('matches').delete().eq('id', action.id));
        break;

      /* ── Показы ──────────────────────────────────────────────────────── */
      case 'ADD_SHOWING': {
        const VALID_SHOWING_COLUMNS = [
          'id', 'realtor_id', 'match_id', 'property_id', 'client_id',
          'showing_date', 'status', 'client_feedback', 'feedback_comment',
          'created_at', 'updated_at', 'event_type', 'client_ids', 'google_event_id'
        ];
        const rawShowing = {};
        VALID_SHOWING_COLUMNS.forEach(col => {
          if (action.showing[col] !== undefined) {
            rawShowing[col] = action.showing[col];
          }
        });
        const showingData = sanitizeObj(rawShowing);
        
        // Ensure property_id null not empty string
        if (showingData.property_id === '') showingData.property_id = null;
        const queries = [withRetry(() => supabase.from('showings').upsert(showingData))];
        if (action.task) queries.push(withRetry(() => supabase.from('tasks').upsert(sanitizeObj(action.task))));
        if (action.matches && action.showing.match_id) {
          const match = action.matches.find(m => m.id === action.showing.match_id);
          if (match) queries.push(withRetry(() => supabase.from('matches').upsert(match)));
        }
        const results = await Promise.all(queries);
        
        // Retry showing if failed due to missing columns
        if (results[0]?.error && _isNewShowingColumnError(results[0].error)) {
          console.warn('[Supabase] New showing columns missing. Retrying without specific missing fields.');
          const stripped = _stripNewShowingFields(showingData, results[0].error);
          const retryResult = await withRetry(() => supabase.from('showings').upsert(stripped));
          if (retryResult?.error) {
            console.error('[Supabase ADD_SHOWING retry error]', retryResult.error);
            handleError(`Ошибка сохранения события: ${retryResult.error.message}`);
            if (typeof onRollback === 'function') onRollback(action);
          }
        } else if (results[0]?.error) {
          console.error('[Supabase ADD_SHOWING error]', results[0].error);
          handleError(`Ошибка сохранения события: ${results[0].error.message}`);
          if (typeof onRollback === 'function') onRollback(action);
        }
        
        results.slice(1).forEach((res, i) => {
          if (res?.error) console.error(`[Supabase ADD_SHOWING sub-query ${i+1} error]`, res.error);
        });
        return;
      }

      case 'UPDATE_SHOWING': {
        const VALID_SHOWING_COLUMNS = [
          'id', 'realtor_id', 'match_id', 'property_id', 'client_id',
          'showing_date', 'status', 'client_feedback', 'feedback_comment',
          'created_at', 'updated_at', 'event_type', 'client_ids', 'google_event_id'
        ];
        const rawShowing = {};
        VALID_SHOWING_COLUMNS.forEach(col => {
          if (action.showing[col] !== undefined) {
            rawShowing[col] = action.showing[col];
          }
        });
        const showingData = sanitizeObj(rawShowing);
        
        if (showingData.property_id === '') showingData.property_id = null;
        const queries = [withRetry(() => supabase.from('showings').upsert(showingData))];
        if (action.matches && action.showing.match_id) {
          const match = action.matches.find(m => m.id === action.showing.match_id);
          if (match) queries.push(withRetry(() => supabase.from('matches').upsert(match)));
        }
        const results = await Promise.all(queries);
        
        if (results[0]?.error && _isNewShowingColumnError(results[0].error)) {
          console.warn('[Supabase] New showing columns missing. Retrying without specific missing fields.');
          const stripped = _stripNewShowingFields(showingData, results[0].error);
          const retryResult = await withRetry(() => supabase.from('showings').upsert(stripped));
          if (retryResult?.error) {
            console.error('[Supabase UPDATE_SHOWING retry error]', retryResult.error);
            handleError(`Ошибка обновления события: ${retryResult.error.message}`);
            if (typeof onRollback === 'function') onRollback(action);
          }
        } else if (results[0]?.error) {
          console.error('[Supabase UPDATE_SHOWING error]', results[0].error);
          handleError(`Ошибка обновления события: ${results[0].error.message}`);
          if (typeof onRollback === 'function') onRollback(action);
        }
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
      

      case 'DELETE_SHOWING':
        result = await withRetry(() => supabase.from('showings').delete().eq('id', action.id));
        break;

      /* ── Сделки ──────────────────────────────────────────────────────── */
      case 'ADD_DEAL': {
        const dealData = {
          ...action.deal,
          deal_date: action.deal.deal_date || null,
          deposit_date: action.deal.deposit_date || null,
          deposit_amount: action.deal.deposit_amount || 0,
          seller_ids: action.deal.seller_ids || [],
          buyer_ids: action.deal.buyer_ids || [],
          notes: action.deal.notes || null,
          mortgage_bank: action.deal.mortgage_bank || null,
          mortgage_amount: action.deal.mortgage_amount || 0,
          mortgage_expiry: action.deal.mortgage_expiry || null,
          lawyer: action.deal.lawyer || null,
        };
        // Remove undefined
        Object.keys(dealData).forEach(key => {
          if (dealData[key] === undefined) delete dealData[key];
        });
        result = await withRetry(() => supabase.from('deals').insert(dealData));
        
        if (result?.error && _isNewDealColumnError(result.error)) {
          console.warn('[Supabase] New deal columns missing. Retrying without specific missing fields.');
          const stripped = _stripNewDealFields(dealData, result.error);
          result = await withRetry(() => supabase.from('deals').insert(stripped));
        }
        break;
      }

      case 'UPDATE_DEAL': {
        const { id: dId, ...dData } = action.deal;
        const updateData = {
          ...dData,
          deal_date: dData.deal_date || null,
          deposit_date: dData.deposit_date || null,
          deposit_amount: dData.deposit_amount ?? 0,
          seller_ids: dData.seller_ids || [],
          buyer_ids: dData.buyer_ids || [],
          notes: dData.notes || null,
          mortgage_bank: dData.mortgage_bank || null,
          mortgage_amount: dData.mortgage_amount || 0,
          mortgage_expiry: dData.mortgage_expiry || null,
          lawyer: dData.lawyer || null,
        };
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined) delete updateData[key];
        });
        result = await withRetry(() => supabase.from('deals').update(updateData).eq('id', dId));

        if (result?.error && _isNewDealColumnError(result.error)) {
          console.warn('[Supabase] New deal columns missing. Retrying without specific missing fields.');
          const stripped = _stripNewDealFields(updateData, result.error);
          result = await withRetry(() => supabase.from('deals').update(stripped).eq('id', dId));
        }
        break;
      }

      case 'DELETE_DEAL':
        result = await withRetry(() => supabase.from('deals').delete().eq('id', action.id));
        break;

      case 'CLOSE_DEAL': {
        const { propertyId, requestId, matchId, now } = action;
        // Run updates in parallel
        const results = await Promise.all([
          withRetry(() => supabase.from('properties').update({ status: 'sold', updated_at: now }).eq('id', propertyId)),
          withRetry(() => supabase.from('requests').update({ status: 'found', updated_at: now }).eq('id', requestId)),
          withRetry(() => supabase.from('matches').update({ status: 'deal', updated_at: now }).eq('id', matchId)),
          withRetry(() => 
            supabase.from('matches')
              .update({ status: 'rejected', updated_at: now })
              .or(`property_id.eq.${propertyId},request_id.eq.${requestId}`)
              .neq('id', matchId)
          )
        ]);
        const firstError = results.find(res => res?.error);
        if (firstError) {
          result = firstError;
        }
        break;
      }

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
      } else if (result.error.code === '42P01' || result.error.message?.includes('does not exist')) {
        // Table doesn't exist - migration needed
        handleError('Таблица не найдена. Необходимо выполнить миграцию базы данных.');
      } else if (result.error.code === '23502') {
        // NOT NULL violation
        handleError('Не заполнено обязательное поле.');
      } else if (result.error.code === '23503') {
        // Foreign key violation
        handleError('Связанный объект не найден. Проверьте данные.');
      } else if (missingColumnMatch) {
        // Missing column - provide helpful message
        const columnName = missingColumnMatch[1];
        handleError(
          `Отсутствует колонка "${columnName}". Необходима миграция БД.`
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

// Fields added in migration 032/033 that may not exist in older DB schemas
// NOTE: client_ids is NOT here — migration 035 has been applied
const NEW_PROPERTY_FIELDS = [
  'seeking_alternative', 'elevator_type',
  'renovation', 'bathroom', 'balcony', 'parking', 'furniture',
  'mortgage',
  'mortgage_available',
  'matcapital_available', 'certificate_available',
  'encumbrance', 'minor_owners', 'docs_ready',
  'apartments_count', 'has_elevator', 'has_garbage_chute',
  'ceiling_height', 'house_series', 'developer',
  'management_company', 'cadastral_number', 'building_type',
  'urgency', 'market_type', 'residential_complex', 'price_min',
  'portfolio_new_builds_files',
  'portfolio_resale_files',
  'portfolio_mortgage_files',
  'portfolio_analog_links',
  // 'client_ids' — REMOVED: migration 035 applied, column exists
];

function _isNewPropertyColumnError(error) {
  if (!error) return false;
  if (error.code !== '42703' && error.code !== 'PGRST204') return false;
  return NEW_PROPERTY_FIELDS.some(f => error.message?.includes(f));
}

function _stripNewPropertyFields(data, error) {
  const stripped = { ...data };
  if (error && error.message) {
    // Only strip fields that are mentioned in the error message
    NEW_PROPERTY_FIELDS.forEach(f => {
      if (error.message.includes(f)) {
        delete stripped[f];
      }
    });
  } else {
    // Fallback: if no message, strip all new fields
    NEW_PROPERTY_FIELDS.forEach(f => delete stripped[f]);
  }
  return stripped;
}

// NOTE: client_ids removed from these lists — migration 035 applied
const NEW_REQUEST_FIELDS = ['mortgage'];
const NEW_SHOWING_FIELDS = ['event_type'];
const NEW_DEAL_FIELDS    = ['mortgage', 'expenses', 'mortgage_bank', 'mortgage_amount', 'mortgage_expiry', 'lawyer'];

function _isNewRequestColumnError(error) {
    if (!error) return false;
    if (error.code !== '42703' && error.code !== 'PGRST204') return false;
    return NEW_REQUEST_FIELDS.some(f => error.message?.includes(f));
}

function _isNewShowingColumnError(error) {
    if (!error) return false;
    if (error.code !== '42703' && error.code !== 'PGRST204') return false;
    return NEW_SHOWING_FIELDS.some(f => error.message?.includes(f));
}

function _isNewDealColumnError(error) {
    if (!error) return false;
    if (error.code !== '42703' && error.code !== 'PGRST204') return false;
    return NEW_DEAL_FIELDS.some(f => error.message?.includes(f));
}

function _stripNewRequestFields(data, error) {
    const stripped = { ...data };
    if (error && error.message) {
        NEW_REQUEST_FIELDS.forEach(f => { if (error.message.includes(f)) delete stripped[f]; });
    } else {
        NEW_REQUEST_FIELDS.forEach(f => delete stripped[f]);
    }
    return stripped;
}

function _stripNewShowingFields(data, error) {
    const stripped = { ...data };
    if (error && error.message) {
        NEW_SHOWING_FIELDS.forEach(f => { if (error.message.includes(f)) delete stripped[f]; });
    } else {
        NEW_SHOWING_FIELDS.forEach(f => delete stripped[f]);
    }
    return stripped;
}

function _stripNewDealFields(data, error) {
    const stripped = { ...data };
    if (error && error.message) {
        NEW_DEAL_FIELDS.forEach(f => { if (error.message.includes(f)) delete stripped[f]; });
    } else {
        NEW_DEAL_FIELDS.forEach(f => delete stripped[f]);
    }
    return stripped;
}
